import { type IEmailService, EmailServiceReal, EmailServiceNoop } from "./EmailService";
import { type IStripeService, StripeServiceReal, StripeServiceNoop } from "./StripeService";
import { type IShippingService, ShippingServiceReal, ShippingServiceNoop } from "./ShippingService";
import { AppConfig } from "../config/appConfig";

export function init(Env: string): {
  EmailService: IEmailService;
  StripeService: IStripeService;
  ShippingService: IShippingService;
} {
  if (Env === "local") {
    return {
      EmailService: new EmailServiceNoop(),
      StripeService: new StripeServiceNoop(),
      ShippingService: new ShippingServiceNoop(),
    };
  }

  return {
    EmailService: AppConfig.isEmailConfigured()
      ? new EmailServiceReal({
          host: AppConfig.EMAIL_HOST!,
          port: AppConfig.EMAIL_PORT,
          user: AppConfig.EMAIL_USER!,
          password: AppConfig.EMAIL_PASSWORD!,
          from: AppConfig.EMAIL_FROM || AppConfig.EMAIL_USER!,
          secure: AppConfig.EMAIL_SECURE,
        })
      : new EmailServiceNoop(),
    StripeService: AppConfig.USE_MOCK_STRIPE || !AppConfig.STRIPE_SECRET_KEY
      ? new StripeServiceNoop()
      : new StripeServiceReal({
          secretKey: AppConfig.STRIPE_SECRET_KEY!,
          webhookSecret: AppConfig.STRIPE_WEBHOOK_SECRET || "",
        }),
    ShippingService: AppConfig.MOCK_INPOST || AppConfig.SHIPPING_PROVIDER !== "INPOST"
      ? new ShippingServiceNoop()
      : new ShippingServiceReal(),
  };
}
