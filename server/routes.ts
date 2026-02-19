import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import crypto from "crypto";
import { applyPaymentStatusUpdate, type PaymentWebhookStatus } from "./paymentStatusService";
import { emailService } from "./emailService";
import { getStripeClient, isMockStripeEnabled } from "./stripeClient";
import { shippingService } from "./shipping/ShippingService";

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
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || "";
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const stripe = getStripeClient();
  const useMockStripe = isMockStripeEnabled();

  app.get("/api/shipping/inpost-config", (_req, res) => {
    const isProduction = process.env.NODE_ENV === "production";
    const geowidgetToken = isProduction
      ? (process.env.INPOST_GEOWIDGET || "")
      : (process.env.INPOST_GEOWIDGET_NGROK || process.env.INPOST_GEOWIDGET || "");
    res.json({
      enabled: Boolean(geowidgetToken),
      geowidgetToken: geowidgetToken || null,
      environment: isProduction ? "production" : "sandbox",
    });
  });

  app.post("/api/payments/webhook", express.raw({ type: "*/*" }), async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body ?? {}));

    let signatureValid = false;
    let payload: any = null;
    const stripeSignature = req.headers["stripe-signature"] as string | undefined;
    const hmacSignature = (req.headers["x-webhook-signature"] || req.headers["x-signature"]) as string | undefined;

    if (stripe && stripeSignature && stripeWebhookSecret) {
      try {
        payload = stripe.webhooks.constructEvent(rawBody, stripeSignature, stripeWebhookSecret);
        signatureValid = true;
      } catch (error) {
        console.error("❌ Stripe webhook signature verification failed:", error);
      }
    } else if (hmacSignature && webhookSecret) {
      signatureValid = verifyHmacSignature(rawBody, hmacSignature, webhookSecret);
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

    const stripeAmount = payload?.type === "payment_intent.succeeded"
      ? payload?.data?.object?.amount
      : null;

    const stripeMetadata = payload?.data?.object?.metadata || {};


    if (Number.isFinite(stripeAmount)) {
      const productTotal = product ? product.price * order.quantity : order.total;

      let deliveryCostFromMetadata = Number.isFinite(stripeMetadata.shippingCost)
        ? Math.round(Number(stripeMetadata.shippingCost))
        : null;

      let deliveryCost = deliveryCostFromMetadata ?? Math.max(0, Number(stripeAmount) - productTotal);
      let finalAmount = Number(stripeAmount);



      if (deliveryCost !== order.deliveryCost || finalAmount !== order.total) {
        const updated = await storage.updateOrder(order.id, {
          deliveryCost,
          total: finalAmount,
        });
        order = updated ?? order;
      }
    }

    const updatedOrder = await applyPaymentStatusUpdate({
      order,
      status: "COMPLETED",
      paymentReference: parsed.paymentReference,
      paymentProvider: parsed.provider,
      product,
    });

    if (updatedOrder.status === "PAID") {
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
      const { amount, orderId, itemsTotal, shippingCost } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const itemsAmount = Number.isFinite(itemsTotal) ? itemsTotal : 0;
      const shippingAmount = Number.isFinite(shippingCost) ? shippingCost : 0;
      const finalAmount = itemsAmount + shippingAmount || amount;

      console.log("💳 Payment Intent Creation", {
        itemsTotal: itemsAmount,
        shippingCost: shippingAmount,
        finalAmount,
        amountFromFrontend: amount,
        orderId,
        stripeMode: stripe ? "live" : "mock",
      });

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
          console.log("📌 Retrieving existing payment intent", {
            paymentIntentId: order.paymentIntentId,
            existingAmount: existingIntent.amount,
          });
          return res.json({
            clientSecret: existingIntent.client_secret,
            paymentIntentId: existingIntent.id,
          });
        }
      }

      // Mock mode for development
      if (useMockStripe) {
        const mockId = `mock_pi_${Date.now()}`;
        const mockClientSecret = `${mockId}_secret_${Math.random().toString(36).substring(7)}`;
        console.log("🧪 Mock payment intent created", {
          mockId,
          amount: finalAmount,
          itemsTotal: itemsAmount,
          shippingCost: shippingAmount,
        });
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

      // Create payment intent with full amount (items + shipping)
      let amountInCents = Math.round(finalAmount * 100);

      // PRODUCTION TEST MODE – REMOVE AFTER TESTING
      // When STRIPE_PROD_TEST_MODE=true, override charge to 0.01 PLN (1 grosz)
      // Real amounts stored in metadata for webhook validation
      if (process.env.STRIPE_PROD_TEST_MODE === 'true') {
        console.log('⚠️ PRODUCTION TEST MODE ENABLED – Charging 0.01 PLN only');
        amountInCents = 1; // 1 grosz = 0.01 PLN
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "pln",
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always',
        },
        metadata: {
          ...(orderId ? { orderId: String(orderId) } : {}),
          itemsTotal: String(itemsAmount),
          shippingCost: String(shippingAmount),
          finalAmount: String(finalAmount),
        },
        description: orderId ? `Order #${orderId}` : undefined,
      });

      console.log("✅ Stripe payment intent created (LIVE)", {
        paymentIntentId: paymentIntent.id,
        amountInCents,
        amountInPLN: finalAmount,
        itemsTotal: itemsAmount,
        shippingCost: shippingAmount,
        metadata: paymentIntent.metadata,
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
      console.error("❌ Error creating payment intent", {
        error: error.message,
        code: error.code,
      });
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
        deliveryCost,
        deliveryMethod,
        deliveryPoint,
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

      if (deliveryMethod === "INPOST_PACZKOMAT" && !deliveryPoint?.id) {
        return res.status(400).json({ message: "Missing InPost delivery point" });
      }

      const product = await storage.getProduct(productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const deliveryCostCents = Number.isFinite(Number(deliveryCost))
        ? Math.max(0, Math.round(Number(deliveryCost)))
        : 0;

      const total = product.price * quantity + deliveryCostCents; // Already in cents

      const resolvedPaymentReference = paymentReference || paymentIntentId || null;

      const createdOrder = await storage.createOrder({
        userId: null, // Anonymous order (no login required)
        productId,
        quantity,
        total,
        deliveryCost: deliveryCostCents,
        deliveryMethod: deliveryMethod ?? null,
        deliveryPointId: deliveryPoint?.id ?? null,
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

      if (order.paymentIntentId && stripe) {
        try {
          await stripe.paymentIntents.update(order.paymentIntentId, {
            metadata: { orderId: String(order.id) },
          });

          const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
          if (paymentIntent.status === "succeeded" && order.status !== "PAID") {
            const updatedOrder = await applyPaymentStatusUpdate({
              order,
              status: "COMPLETED",
              paymentReference: paymentIntent.id,
              paymentProvider: "stripe",
              product,
            });

            if (updatedOrder.status === "PAID") {
              console.log("✅ Order paid via reconciliation", {
                orderId: updatedOrder.id,
                paymentIntentId: paymentIntent.id,
              });
            }
          }
        } catch (error) {
          console.warn("⚠️ Failed to reconcile payment intent for order", {
            orderId: order.id,
            error,
          });
        }
      }

      res.status(201).json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/shipments/:orderId/ship", async (req, res) => {
    try {
      const orderId = Number(req.params.orderId);
      if (!Number.isFinite(orderId)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const shipment = await shippingService.markShipped(orderId);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }

      await emailService.sendShipmentEmail({
        order,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
      });

      return res.json({
        orderId,
        status: "SHIPPED",
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
