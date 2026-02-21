import type { Request, Response } from "express";
import crypto from "crypto";
import type { PaymentWebhookStatusType } from "../constants/paymentStatus";
import type { EmailService } from "../services/EmailService";
import type { StripeService } from "../services/StripeService";
import type { PaymentStatusService } from "../services/PaymentStatusService";
import type { Order } from "@shared/types/order";
import { storage } from "../storage";
import { AppConfig } from "../config/appConfig";

type PaymentWebhookStatus = PaymentWebhookStatusType;

interface ParsedWebhookData {
  eventId: string | null;
  status: PaymentWebhookStatus;
  paymentReference: string | null;
  orderId: number | null;
  provider: string;
}

interface WebhookDependencies {
  emailService: EmailService;
  stripeService: StripeService;
  paymentStatusService: PaymentStatusService;
}

/**
 * Normalizes webhook signature header by extracting the actual signature value
 */
function normalizeSignatureHeader(signatureHeader: string): string {
  if (signatureHeader.includes("=")) {
    const parts = signatureHeader.split("=");
    return parts[parts.length - 1].trim();
  }
  return signatureHeader.trim();
}

/**
 * Verifies HMAC signature for custom webhook providers
 */
function verifyHmacSignature(rawBody: Buffer, signatureHeader: string, secret: string): boolean {
  if (!secret || !signatureHeader) return false;
  const normalized = normalizeSignatureHeader(signatureHeader);
  const computedHex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const computed = Buffer.from(computedHex, "hex");

  let provided: Buffer;
  try {
    provided = Buffer.from(normalized, "hex");
    if (provided.length !== computed.length) {
      provided = Buffer.from(normalized, "base64");
    }
  } catch {
    return false;
  }

  if (provided.length !== computed.length) return false;
  return crypto.timingSafeEqual(computed, provided);
}

/**
 * Parses webhook payload into standardized format
 */
function parseWebhookPayload(payload: any): ParsedWebhookData {
  const eventId = payload?.eventId || payload?.event_id || payload?.id || null;

  // Stripe format
  if (payload?.type && payload?.data?.object) {
    const object = payload.data.object;
    const stripeStatus = object?.status || "";

    let status: PaymentWebhookStatus = "UNKNOWN";
    if (payload.type === "payment_intent.succeeded" && stripeStatus === "succeeded") {
      status = "COMPLETED";
    }

    const paymentReference = object?.payment_intent || object?.id || null;
    const metadataOrderId = object?.metadata?.orderId ? Number(object.metadata.orderId) : null;

    return {
      eventId,
      status,
      paymentReference,
      orderId: Number.isFinite(metadataOrderId) ? metadataOrderId : null,
      provider: "stripe",
    };
  }

  const rawStatus = String(payload?.status || payload?.paymentStatus || payload?.orderStatus || "").toUpperCase();
  let status: PaymentWebhookStatus = "UNKNOWN";
  if (["COMPLETED", "SUCCESS", "PAID", "SUCCEEDED"].includes(rawStatus)) {
    status = "COMPLETED";
  } else if (["PENDING", "PROCESSING"].includes(rawStatus)) {
    status = "PENDING";
  } else if (["CANCELED", "CANCELLED", "FAILED", "ERROR"].includes(rawStatus)) {
    status = rawStatus.startsWith("CANCEL") ? "CANCELED" : "FAILED";
  }

  const paymentReference = payload?.paymentReference || payload?.paymentIntentId || payload?.paymentIntent || payload?.orderId || payload?.extOrderId || null;
  const orderIdRaw = payload?.orderId || payload?.extOrderId || null;
  const orderId = orderIdRaw ? Number(orderIdRaw) : null;

  return {
    eventId,
    status,
    paymentReference: paymentReference ? String(paymentReference) : null,
    orderId: Number.isFinite(orderId) ? orderId : null,
    provider: payload?.provider || "unknown",
  };
}

/**
 * Verifies webhook signature based on provider
 */
async function verifyWebhookSignature(
  rawBody: Buffer,
  stripeSignature: string | undefined,
  hmacSignature: string | undefined,
  deps: WebhookDependencies
): Promise<{ valid: boolean; payload: any | null }> {
  const stripe = deps.stripeService.isAvailable() ? deps.stripeService.getClient() : null;
  const useMockStripe = deps.stripeService.isMockMode();
  const webhookSecret = AppConfig.PAYMENT_WEBHOOK_SECRET;
  const stripeWebhookSecret = AppConfig.STRIPE_WEBHOOK_SECRET;

  if (stripeSignature) {
    if (useMockStripe) {
      try {
        const payload = JSON.parse(rawBody.toString("utf8"));
        return { valid: true, payload };
      } catch (error) {
        console.error("❌ Failed to parse mock webhook payload:", error);
        return { valid: false, payload: null };
      }
    } else {
      try {
        const payload = stripe!.webhooks.constructEvent(rawBody, stripeSignature, stripeWebhookSecret!);
        return { valid: true, payload };
      } catch (error) {
        console.error("❌ Stripe webhook signature verification failed:", error);
        return { valid: false, payload: null };
      }
    }
  } else if (hmacSignature && webhookSecret) {
    const valid = verifyHmacSignature(rawBody, hmacSignature, webhookSecret);
    if (valid) {
      try {
        const payload = JSON.parse(rawBody.toString("utf8"));
        return { valid: true, payload };
      } catch (error) {
        console.error("❌ Failed to parse webhook payload:", error);
        return { valid: false, payload: null };
      }
    }
  }

  return { valid: false, payload: null };
}

/**
 * Records invalid webhook signature event
 */
async function recordInvalidSignature(rawBody: Buffer): Promise<void> {
  await storage.recordWebhookEvent({
    id: crypto.createHash("sha256").update(rawBody).digest("hex"),
    receivedAt: new Date().toISOString(),
    provider: "unknown",
    status: "INVALID_SIGNATURE",
    paymentReference: null,
    orderId: null,
    signatureValid: false,
    rawPayload: rawBody.toString("utf8"),
  });
}

/**
 * Checks if event should be ignored based on filters
 */
function shouldIgnoreEvent(payload: any): { ignore: boolean; reason?: string } {
  // Manual-only mode check
  if (AppConfig.WEBHOOK_MANUAL_ONLY && payload?.type && payload?.data?.object) {
    const metadata = payload.data.object.metadata || {};
    if (metadata.manualWebhook !== "true") {
      return { ignore: true, reason: "manual_only" };
    }
  }

  // Unsupported event type
  if (payload?.type && payload?.data?.object) {
    const type = payload.type as string;
    if (type !== "payment_intent.succeeded") {
      return { ignore: true, reason: "unsupported_event" };
    }
  }

  return { ignore: false };
}

/**
 * Finds order by ID or payment reference
 */
async function findOrder(parsed: ParsedWebhookData): Promise<any | null> {
  let order = parsed.orderId ? await storage.getOrder(parsed.orderId) : undefined;
  if (!order && parsed.paymentReference) {
    order = await storage.getOrderByPaymentReference(parsed.paymentReference);
  }
  return order || null;
}

/**
 * Updates order amounts from Stripe metadata
 */
async function updateOrderAmountsFromStripe(order: any, payload: any): Promise<any> {
  const stripeAmount = payload?.type === "payment_intent.succeeded"
    ? payload?.data?.object?.amount
    : null;

  if (!Number.isFinite(stripeAmount)) {
    return order;
  }

  const product = order.productId ? await storage.getProduct(order.productId) : undefined;
  const productTotal = product ? product.price * order.quantity : order.total;
  const stripeMetadata = payload?.data?.object?.metadata || {};

  const deliveryCostFromMetadata = Number.isFinite(stripeMetadata.shippingCost)
    ? Math.round(Number(stripeMetadata.shippingCost))
    : null;

  const deliveryCost = deliveryCostFromMetadata ?? Math.max(0, Number(stripeAmount) - productTotal);
  const finalAmount = Number(stripeAmount);

  if (deliveryCost !== order.deliveryCost || finalAmount !== order.total) {
    const updated = await storage.updateOrder(order.id, {
      deliveryCost,
      total: finalAmount,
    });
    return updated ?? order;
  }

  return order;
}

/**
 * Processes successful payment webhook
 */
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

/**
 * Records successful webhook event
 */
async function recordSuccessfulWebhook(
  eventId: string,
  parsed: ParsedWebhookData,
  rawBody: Buffer
): Promise<void> {
  await storage.recordWebhookEvent({
    id: eventId,
    receivedAt: new Date().toISOString(),
    provider: parsed.provider,
    status: parsed.status,
    paymentReference: parsed.paymentReference,
    orderId: parsed.orderId,
    signatureValid: true,
    rawPayload: rawBody.toString("utf8"),
  });
}

/**
 * Payment Webhook Handler Factory
 * Handles incoming payment webhooks from Stripe or custom providers
 */
export function PaymentWebhookHandler(deps: WebhookDependencies) {
  return async (req: Request, res: Response) => {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body ?? {}));

    const stripeSignature = req.headers["stripe-signature"] as string | undefined;
    const hmacSignature = (req.headers["x-webhook-signature"] || req.headers["x-signature"]) as string | undefined;

    // Step 1: Verify webhook signature
    const { valid, payload } = await verifyWebhookSignature(rawBody, stripeSignature, hmacSignature, deps);
    if (!valid || !payload) {
      await recordInvalidSignature(rawBody);
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    // Step 2: Check if event should be ignored
    const ignoreCheck = shouldIgnoreEvent(payload);
    if (ignoreCheck.ignore) {
      console.log(`ℹ️ Webhook ignored (${ignoreCheck.reason})`, {
        eventId: payload?.id,
        type: payload?.type,
      });
      return res.status(200).json({ received: true, ignored: ignoreCheck.reason });
    }

    // Step 3: Parse webhook data
    const parsed = parseWebhookPayload(payload);
    const eventId = parsed.eventId || crypto.createHash("sha256").update(rawBody).digest("hex");

    console.log("📥 Webhook event received", {
      eventId,
      status: parsed.status,
      paymentReference: parsed.paymentReference,
      orderId: parsed.orderId,
      provider: parsed.provider,
    });

    // Step 4: Check for duplicate events
    const alreadyProcessed = await storage.hasProcessedWebhookEvent(eventId);
    if (alreadyProcessed) {
      console.log("ℹ️ Webhook ignored (duplicate)", { eventId });
      return res.status(200).json({ received: true, duplicate: true });
    }

    // Step 5: Find order
    if (!parsed.orderId && parsed.paymentReference) {
      console.warn("⚠️ Webhook missing orderId, falling back to payment reference", {
        eventId,
        paymentReference: parsed.paymentReference,
      });
    }

    let order = await findOrder(parsed);
    if (!order) {
      console.warn("⚠️ Webhook received but no matching order found", {
        eventId,
        paymentReference: parsed.paymentReference,
        orderId: parsed.orderId,
      });
      return res.status(202).json({ received: true, order: "not_found" });
    }

    console.log("✅ Webhook resolved order", {
      eventId,
      orderId: order.id,
      paymentIntentId: order.paymentIntentId,
    });

    // Step 6: Check if order already paid
    if (order.status === "PAID") {
      console.log("ℹ️ Webhook ignored (order already paid)", {
        eventId,
        orderId: order.id,
      });
      return res.status(200).json({ received: true, order: "already_paid" });
    }

    // Step 7: Update order amounts from Stripe if available
    order = await updateOrderAmountsFromStripe(order, payload);

    // Step 8: Process payment
    const updatedOrder = await processPayment(order, parsed, deps);

    // Step 9: Record successful webhook event
    if (updatedOrder.status === "PAID") {
      await recordSuccessfulWebhook(eventId, parsed, rawBody);
    }

    return res.status(200).json({ received: true });
  };
}
