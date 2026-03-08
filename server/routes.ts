import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import type { IEmailService } from "./services/EmailService";
import type { IStripeService } from "./services/StripeService";
import type { PaymentStatusService } from "./services/PaymentStatusService";
import type { IShippingService } from "./services/ShippingService";

import { PaymentWebhookHandler } from "./handlers/PaymentWebhookHandler";
import { ListProductsHandler, GetProductHandler } from "./handlers/ProductHandlers";
import { CreatePaymentIntentHandler } from "./handlers/CreatePaymentIntentHandler";
import { CreateOrderHandler } from "./handlers/CreateOrderHandler";
import { MarkOrderShippedHandler } from "./handlers/ShipmentHandlers";
import { GetInPostConfigHandler } from "./handlers/InPostHandlers";

export async function registerRoutes(
  app: Express,
  services: {
    emailService: IEmailService;
    stripeService: IStripeService;
    paymentStatusService: PaymentStatusService;
    shippingService: IShippingService;
  }
): Promise<Server> {

   app.get(
    "/api/shipping/inpost-config",
    GetInPostConfigHandler()
  );

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

   app.get("/api/products", ListProductsHandler());
  app.get("/api/products/:id", GetProductHandler());

   app.post(
    "/api/orders",
    CreateOrderHandler({
      emailService: services.emailService,
      stripeService: services.stripeService,
      paymentStatusService: services.paymentStatusService,
    })
  );

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
