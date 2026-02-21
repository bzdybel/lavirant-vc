import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import type { EmailService } from "./services/EmailService";
import type { StripeService } from "./services/StripeService";
import type { PaymentStatusService } from "./services/PaymentStatusService";
import type { ShippingService } from "./services/ShippingService";

// Route Handlers
import { PaymentWebhookHandler } from "./handlers/PaymentWebhookHandler";
import { ListProductsHandler, GetProductHandler } from "./handlers/ProductHandlers";
import { CreatePaymentIntentHandler } from "./handlers/CreatePaymentIntentHandler";
import { CreateOrderHandler } from "./handlers/CreateOrderHandler";
import { MarkOrderShippedHandler } from "./handlers/ShipmentHandlers";
import { GetInPostConfigHandler } from "./handlers/InPostHandlers";

export async function registerRoutes(
  app: Express,
  services: {
    emailService: EmailService;
    stripeService: StripeService;
    paymentStatusService: PaymentStatusService;
    shippingService: ShippingService;
  }
): Promise<Server> {
  
  // ============================= Shipping Routes =============================
  app.get(
    "/api/shipping/inpost-config",
    GetInPostConfigHandler()
  );

  // ============================= Payment Routes =============================
  app.post(
    "/api/payments/webhook",
    express.raw({ type: "*/*" }),
    PaymentWebhookHandler({
      emailService: services.emailService,
      stripeService: services.stripeService,
      paymentStatusService: services.paymentStatusService,
    })
  );

  app.post(
    "/api/create-payment-intent",
    CreatePaymentIntentHandler({
      stripeService: services.stripeService,
    })
  );

  // ============================= Product Routes =============================
  app.get("/api/products", ListProductsHandler());
  app.get("/api/products/:id", GetProductHandler());

  // ============================= Order Routes =============================
  app.post(
    "/api/orders",
    CreateOrderHandler({
      emailService: services.emailService,
      stripeService: services.stripeService,
      paymentStatusService: services.paymentStatusService,
    })
  );

  // ============================= Admin Routes =============================
  app.post(
    "/api/admin/shipments/:orderId/ship",
    MarkOrderShippedHandler({
      emailService: services.emailService,
      shippingService: services.shippingService,
    })
  );

  const httpServer = createServer(app);
  return httpServer;
}
