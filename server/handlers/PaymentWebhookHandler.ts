import type { Request, Response } from "express";
import crypto from "crypto";
import type { PaymentWebhookStatusType } from "../constants/paymentStatus";
import type { IEmailService } from "../services/EmailService";
import type { IStripeService } from "../services/StripeService";
import type { PaymentStatusService } from "../services/PaymentStatusService";
import type { Order } from "@shared/types/order";
import { storage } from "../storage";
import { AppConfig } from "../config/appConfig";

interface ParsedWebhookData {
  eventId: string | null;
  status: PaymentWebhookStatusType;
  paymentReference: string | null;
  orderId: number | null;
  provider: string;
}

interface WebhookDependencies {
  emailService: IEmailService;
  stripeService: IStripeService;
  paymentStatusService: PaymentStatusService;
}

function generateEventId(rawBody: Buffer, parsed?: ParsedWebhookData): string {
  return parsed?.eventId || crypto.createHash("sha256").update(rawBody).digest("hex");
}

function extractSignature(signatureHeader: string): string {
  if (signatureHeader.includes("=")) {
    const parts = signatureHeader.split("=");
    return parts[parts.length - 1].trim();
  }
  return signatureHeader.trim();
}

function verifyHmac(rawBody: Buffer, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;

  const normalized = extractSignature(signature);
  const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const computedBuffer = Buffer.from(computed, "hex");

  let providedBuffer: Buffer;
  try {
    providedBuffer = Buffer.from(normalized, "hex");
    if (providedBuffer.length !== computedBuffer.length) {
      providedBuffer = Buffer.from(normalized, "base64");
    }
  } catch {
    return false;
  }

  if (providedBuffer.length !== computedBuffer.length) return false;
  return crypto.timingSafeEqual(computedBuffer, providedBuffer);
}

function extractEventId(payload: any): string | null {
  return payload?.eventId || payload?.event_id || payload?.id || null;
}

function mapStatusFromString(rawStatus: string): PaymentWebhookStatusType {
  const status = rawStatus.toUpperCase();

  if (["COMPLETED", "SUCCESS", "PAID", "SUCCEEDED"].includes(status)) {
    return "COMPLETED";
  }
  if (["PENDING", "PROCESSING"].includes(status)) {
    return "PENDING";
  }
  if (["CANCELED", "CANCELLED"].includes(status)) {
    return "CANCELED";
  }
  if (["FAILED", "ERROR"].includes(status)) {
    return "FAILED";
  }

  return "UNKNOWN";
}

function extractOrderId(payload: any): number | null {
  const orderIdRaw = payload?.orderId || payload?.extOrderId;
  const orderId = orderIdRaw ? Number(orderIdRaw) : null;
  return Number.isFinite(orderId) ? orderId : null;
}

function extractPaymentReference(payload: any): string | null {
  const ref = payload?.paymentReference || payload?.paymentIntentId || payload?.paymentIntent || payload?.orderId || payload?.extOrderId;
  return ref ? String(ref) : null;
}

function parseStripeWebhook(payload: any, eventId: string | null): ParsedWebhookData {
  const object = payload.data.object;
  const status = payload.type === "payment_intent.succeeded" && object?.status === "succeeded"
    ? "COMPLETED"
    : "UNKNOWN";

  const metadataOrderId = object?.metadata?.orderId ? Number(object.metadata.orderId) : null;

  return {
    eventId,
    status: status as PaymentWebhookStatusType,
    paymentReference: object?.payment_intent || object?.id || null,
    orderId: Number.isFinite(metadataOrderId) ? metadataOrderId : null,
    provider: "stripe",
  };
}

function parseGenericWebhook(payload: any, eventId: string | null): ParsedWebhookData {
  const rawStatus = String(payload?.status || payload?.paymentStatus || payload?.orderStatus || "");

  return {
    eventId,
    status: mapStatusFromString(rawStatus),
    paymentReference: extractPaymentReference(payload),
    orderId: extractOrderId(payload),
    provider: payload?.provider || "unknown",
  };
}

function parseWebhookPayload(payload: any): ParsedWebhookData {
  const eventId = extractEventId(payload);

  if (payload?.type && payload?.data?.object) {
    return parseStripeWebhook(payload, eventId);
  }

  return parseGenericWebhook(payload, eventId);
}

async function verifyWebhookSignature(
  rawBody: Buffer,
  stripeSignature: string | undefined,
  hmacSignature: string | undefined,
  deps: WebhookDependencies
): Promise<any | null> {
  const webhookSecret = AppConfig.PAYMENT_WEBHOOK_SECRET;
  const stripeWebhookSecret = AppConfig.STRIPE_WEBHOOK_SECRET;

  if (stripeSignature) {
    try {
      return deps.stripeService.constructWebhookEvent(rawBody, stripeSignature, stripeWebhookSecret!);
    } catch {
      return null;
    }
  }

  if (hmacSignature && webhookSecret) {
    const valid = verifyHmac(rawBody, hmacSignature, webhookSecret);
    if (!valid) return null;

    try {
      return JSON.parse(rawBody.toString("utf8"));
    } catch {
      return null;
    }
  }

  return null;
}

async function recordWebhookEvent(eventId: string, parsed: ParsedWebhookData, rawBody: Buffer, signatureValid: boolean): Promise<void> {
  await storage.recordWebhookEvent({
    id: eventId,
    receivedAt: new Date().toISOString(),
    provider: signatureValid ? parsed.provider : "unknown",
    status: signatureValid ? parsed.status : "INVALID_SIGNATURE",
    paymentReference: signatureValid ? parsed.paymentReference : null,
    orderId: signatureValid ? parsed.orderId : null,
    signatureValid,
    rawPayload: rawBody.toString("utf8"),
  });
}

function shouldIgnoreEvent(payload: any): string | null {
  if (!payload?.type || !payload?.data?.object) return null;

  const type = payload.type as string;
  if (type !== "payment_intent.succeeded") {
    return "unsupported_event";
  }

  return null;
}

async function findOrder(parsed: ParsedWebhookData): Promise<any | null> {
  let order = parsed.orderId ? await storage.getOrder(parsed.orderId) : undefined;
  if (!order && parsed.paymentReference) {
    order = await storage.getOrderByPaymentReference(parsed.paymentReference);
  }
  return order || null;
}

function extractStripeAmount(payload: any): number | null {
  if (payload?.type !== "payment_intent.succeeded") return null;

  const amount = payload?.data?.object?.amount;
  return Number.isFinite(amount) ? Number(amount) : null;
}

function extractStripeMetadata(payload: any): Record<string, any> {
  return payload?.data?.object?.metadata || {};
}

async function updateOrderAmountsFromStripe(order: any, payload: any): Promise<any> {
  const stripeAmount = extractStripeAmount(payload);
  if (!stripeAmount) return order;

  const product = order.productId ? await storage.getProduct(order.productId) : undefined;
  const productTotal = product ? product.price * order.quantity : order.total;
  const metadata = extractStripeMetadata(payload);

  const deliveryCostFromMetadata = Number.isFinite(metadata.shippingCost)
    ? Math.round(Number(metadata.shippingCost))
    : null;

  const deliveryCost = deliveryCostFromMetadata ?? Math.max(0, stripeAmount - productTotal);

  if (deliveryCost !== order.deliveryCost || stripeAmount !== order.total) {
    const updated = await storage.updateOrder(order.id, {
      deliveryCost,
      total: stripeAmount,
    });
    return updated ?? order;
  }

  return order;
}

async function processPayment(
  order: any,
  parsed: ParsedWebhookData,
  deps: WebhookDependencies
): Promise<any> {
  const product = order.productId ? await storage.getProduct(order.productId) : undefined;

  return await deps.paymentStatusService.applyPaymentStatusUpdate({
    order: order as Order,
    status: "COMPLETED",
    paymentReference: parsed.paymentReference,
    paymentProvider: parsed.provider,
    product,
  });
}

async function recordSuccessfulWebhook(
  eventId: string,
  parsed: ParsedWebhookData,
  rawBody: Buffer
): Promise<void> {
  await recordWebhookEvent(eventId, parsed, rawBody, true);
}

export function PaymentWebhookHandler(deps: WebhookDependencies) {
  return async (req: Request, res: Response) => {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body ?? {}));

    const stripeSignature = req.headers["stripe-signature"] as string | undefined;
    const hmacSignature = (req.headers["x-webhook-signature"] || req.headers["x-signature"]) as string | undefined;

    const payload = await verifyWebhookSignature(rawBody, stripeSignature, hmacSignature, deps);
    if (!payload) {
      const parsed = parseWebhookPayload({});
      const eventId = generateEventId(rawBody);
      await recordWebhookEvent(eventId, parsed, rawBody, false);
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    const ignoreReason = shouldIgnoreEvent(payload);
    if (ignoreReason) {
      return res.status(200).json({ received: true, ignored: ignoreReason });
    }

    const parsed = parseWebhookPayload(payload);
    const eventId = generateEventId(rawBody, parsed);

    const alreadyProcessed = await storage.hasProcessedWebhookEvent(eventId);
    if (alreadyProcessed) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    let order = await findOrder(parsed);
    if (!order) {
      return res.status(202).json({ received: true, order: "not_found" });
    }

    if (order.status === "PAID") {
      return res.status(200).json({ received: true, order: "already_paid" });
    }

    order = await updateOrderAmountsFromStripe(order, payload);

    const updatedOrder = await processPayment(order, parsed, deps);

    if (updatedOrder.status === "PAID") {
      await recordSuccessfulWebhook(eventId, parsed, rawBody);
    }

    return res.status(200).json({ received: true });
  };
}
