import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import crypto from "crypto";
import { applyPaymentStatusUpdate, type PaymentWebhookStatus } from "./paymentStatusService";
import { emailService } from "./emailService";
import { stripe, USE_MOCK_STRIPE } from "./stripeClient";

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

function normalizeSignatureHeader(signatureHeader: string): string {
  if (signatureHeader.includes("=")) {
    const parts = signatureHeader.split("=");
    return parts[parts.length - 1].trim();
  }
  return signatureHeader.trim();
}

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

function parseWebhookPayload(payload: any): {
  eventId: string | null;
  status: PaymentWebhookStatus;
  paymentReference: string | null;
  orderId: number | null;
  provider: string;
} {
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

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/payments/webhook", express.raw({ type: "*/*" }), async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body ?? {}));

    let signatureValid = false;
    let payload: any = null;
    const stripeSignature = req.headers["stripe-signature"] as string | undefined;
    const hmacSignature = (req.headers["x-webhook-signature"] || req.headers["x-signature"]) as string | undefined;

    if (stripe && stripeSignature && STRIPE_WEBHOOK_SECRET) {
      try {
        payload = stripe.webhooks.constructEvent(rawBody, stripeSignature, STRIPE_WEBHOOK_SECRET);
        signatureValid = true;
      } catch (error) {
        console.error("❌ Stripe webhook signature verification failed:", error);
      }
    } else if (hmacSignature && WEBHOOK_SECRET) {
      signatureValid = verifyHmacSignature(rawBody, hmacSignature, WEBHOOK_SECRET);
      if (signatureValid) {
        try {
          payload = JSON.parse(rawBody.toString("utf8"));
        } catch (error) {
          console.error("❌ Failed to parse webhook payload:", error);
        }
      }
    }

    if (!signatureValid || !payload) {
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
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    if (
      process.env.WEBHOOK_MANUAL_ONLY === "true" &&
      payload?.type &&
      payload?.data?.object
    ) {
      const metadata = payload.data.object.metadata || {};
      if (metadata.manualWebhook !== "true") {
        console.log("ℹ️ Webhook ignored (manual-only mode)", {
          eventId: payload?.id,
          type: payload?.type,
        });
        return res.status(200).json({ received: true, ignored: "manual_only" });
      }
    }

    if (payload?.type && payload?.data?.object) {
      const type = payload.type as string;
      if (type !== "payment_intent.succeeded") {
        console.log("ℹ️ Webhook ignored (unsupported event type)", {
          eventId: payload?.id,
          type,
        });
        return res.status(200).json({ received: true, ignored: "unsupported_event" });
      }
    }

    const parsed = parseWebhookPayload(payload);
    const eventId = parsed.eventId || crypto.createHash("sha256").update(rawBody).digest("hex");

    const alreadyProcessed = await storage.hasProcessedWebhookEvent(eventId);
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

    console.log("📥 Webhook event received", {
      eventId,
      status: parsed.status,
      paymentReference: parsed.paymentReference,
      orderId: parsed.orderId,
      provider: parsed.provider,
    });

    if (alreadyProcessed) {
      console.log("ℹ️ Webhook ignored (duplicate)", { eventId });
      return res.status(200).json({ received: true, duplicate: true });
    }

    if (!parsed.orderId && parsed.paymentReference) {
      console.warn("⚠️ Webhook missing orderId, falling back to payment reference", {
        eventId,
        paymentReference: parsed.paymentReference,
      });
    }

    let order = parsed.orderId ? await storage.getOrder(parsed.orderId) : undefined;
    if (!order && parsed.paymentReference) {
      order = await storage.getOrderByPaymentReference(parsed.paymentReference);
    }

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

    if (order.status === "PAID") {
      console.log("ℹ️ Webhook ignored (order already paid)", {
        eventId,
        orderId: order.id,
      });
      return res.status(200).json({ received: true, order: "already_paid" });
    }

    const product = order.productId ? await storage.getProduct(order.productId) : undefined;

    await applyPaymentStatusUpdate({
      order,
      status: "COMPLETED",
      paymentReference: parsed.paymentReference,
      paymentProvider: parsed.provider,
      product,
    });

    return res.status(200).json({ received: true });
  });

  // API routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe payment intent route
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, orderId } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      let order: Awaited<ReturnType<typeof storage.getOrder>> | undefined;
      if (orderId) {
        order = await storage.getOrder(Number(orderId));
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }

        if (order.paymentIntentId) {
          if (!stripe) {
            return res.status(500).json({ message: "Stripe is not configured" });
          }
          const existingIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
          return res.json({
            clientSecret: existingIntent.client_secret,
            paymentIntentId: existingIntent.id,
          });
        }
      }

      // Mock mode for development
      if (USE_MOCK_STRIPE) {
        const mockId = `mock_pi_${Date.now()}`;
        const mockClientSecret = `${mockId}_secret_${Math.random().toString(36).substring(7)}`;
        if (orderId) {
          await storage.updateOrder(Number(orderId), {
            status: "PAYMENT_PENDING",
            paymentPendingAt: new Date().toISOString(),
            paymentProvider: "stripe",
            paymentIntentId: mockId,
            paymentReference: mockId,
          });
        }
        return res.json({ clientSecret: mockClientSecret, paymentIntentId: mockId });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "pln",
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always',
        },
        metadata: orderId ? { orderId: String(orderId) } : undefined,
      });

      if (orderId) {
        await storage.updateOrder(Number(orderId), {
          status: "PAYMENT_PENDING",
          paymentPendingAt: new Date().toISOString(),
          paymentProvider: "stripe",
          paymentReference: paymentIntent.id,
          paymentIntentId: paymentIntent.id,
        });
      }

      res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
    } catch (error: any) {
      res.status(500).json({ message: `Error creating payment intent: ${error.message}` });
    }
  });

  // Create order endpoint
  app.post("/api/orders", async (req, res) => {
    try {
      const {
        productId,
        quantity,
        paymentIntentId,
        paymentReference,
        paymentProvider,
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        country
      } = req.body;

      if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({ message: "Invalid order data" });
      }

      if (!firstName || !lastName || !email || !phone || !address || !city || !postalCode || !country) {
        return res.status(400).json({ message: "Missing customer information" });
      }

      const product = await storage.getProduct(productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const total = product.price * quantity; // Already in cents

      const resolvedPaymentReference = paymentReference || paymentIntentId || null;

      const createdOrder = await storage.createOrder({
        userId: null, // Anonymous order (no login required)
        productId,
        quantity,
        total,
        status: "CREATED",
        paymentIntentId: paymentIntentId || null,
        paymentReference: resolvedPaymentReference,
        paymentProvider: paymentProvider || (paymentIntentId ? "stripe" : null),
        paymentPendingAt: resolvedPaymentReference ? new Date().toISOString() : null,
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        postalCode,
        country,
        createdAt: new Date().toISOString(),
      });

      const order = resolvedPaymentReference
        ? (await storage.updateOrder(createdOrder.id, { status: "PAYMENT_PENDING" })) ?? createdOrder
        : createdOrder;

      emailService.sendOrderConfirmation({
        orderId: order.id,
        firstName,
        lastName,
        email,
        productName: product.name,
        quantity,
        total,
        address,
        city,
        postalCode,
        country,
        orderDate: order.createdAt,
      }).catch(error => {
        console.error("Failed to send order confirmation email:", error);
      });

      res.status(201).json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
