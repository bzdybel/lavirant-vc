import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import type { IEmailService } from "./services/EmailService";
import type { IStripeService } from "./services/StripeService";
import type { PaymentStatusService } from "./services/PaymentStatusService";
import type { IShippingService } from "./services/ShippingService";
import type { HealthcheckService } from "./services/HealthcheckService";
import type { CaptchaPort } from "./captcha/captcha.port";

import { PaymentWebhookHandler } from "./handlers/PaymentWebhookHandler";
import { ListProductsHandler, GetProductHandler } from "./handlers/ProductHandlers";
import { CreatePaymentIntentHandler } from "./handlers/CreatePaymentIntentHandler";
import { UpdatePaymentIntentHandler } from "./handlers/UpdatePaymentIntentHandler";
import { CreateOrderHandler } from "./handlers/CreateOrderHandler";
import { MarkOrderShippedHandler } from "./handlers/ShipmentHandlers";
import { GetInPostConfigHandler } from "./handlers/InPostHandlers";
import { HealthcheckHandler } from "./handlers/HealthcheckHandler";
import { CaptchaMiddleware } from "./middleware/captcha.middleware";
import { HealthBasicAuthMiddleware } from "./middleware/healthBasicAuthMiddleware";
import { HealthRateLimitMiddleware } from "./middleware/healthRateLimitMiddleware";
import { HealthTimeoutMiddleware } from "./middleware/healthTimeoutMiddleware";

export async function registerRoutes(
  app: Express,
  services: {
    emailService: IEmailService;
    stripeService: IStripeService;
    paymentStatusService: PaymentStatusService;
    shippingService: IShippingService;
    captchaService: CaptchaPort;
    healthcheckService: HealthcheckService;
  }
): Promise<Server> {
  const healthBasicAuth = new HealthBasicAuthMiddleware();
  const healthRateLimit = new HealthRateLimitMiddleware();
  const healthTimeout = new HealthTimeoutMiddleware();
  const captchaMiddleware = new CaptchaMiddleware({ captchaService: services.captchaService });
  const captchaGuard = captchaMiddleware.handle();

  app.get(
    "/healthcheck",
    healthBasicAuth.handle(),
    healthRateLimit.handle(),
    healthTimeout.handle(),
    HealthcheckHandler(services.healthcheckService)
  );

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
    captchaGuard,
    CreatePaymentIntentHandler({
      stripeService: services.stripeService,
    })
  );

  app.patch(
    "/api/update-payment-intent",
    captchaGuard,
    UpdatePaymentIntentHandler({
      stripeService: services.stripeService,
    })
  );

  app.get("/api/products", ListProductsHandler());
  app.get("/api/products/:id", GetProductHandler());

  app.post(
    "/api/orders",
    captchaGuard,
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
