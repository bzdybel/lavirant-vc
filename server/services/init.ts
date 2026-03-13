import { type IEmailService, EmailServiceReal, EmailServiceNoop } from "./EmailService";
import { type IStripeService, StripeServiceReal, StripeServiceNoop } from "./StripeService";
import { type IShippingService, ShippingServiceReal, ShippingServiceNoop } from "./ShippingService";
import { PaymentStatusService } from "./PaymentStatusService";
import { HealthcheckService } from "./HealthcheckService";
import { AppConfig } from "../config/appConfig";

type Env = "local" | "production";

type Services = {
  EmailService: IEmailService;
  StripeService: IStripeService;
  ShippingService: IShippingService;
  PaymentStatusService: PaymentStatusService;
  HealthcheckService: HealthcheckService;
};

export function init(env: Env): Services {
  const envServices: Pick<Services, "EmailService" | "StripeService" | "ShippingService"> = {
    local: {
      EmailService: new EmailServiceNoop(),
      StripeService: new StripeServiceNoop(),
      ShippingService: new ShippingServiceNoop(),
    },
    production: {
      EmailService: new EmailServiceReal({
        host: AppConfig.EMAIL_HOST!,
        port: AppConfig.EMAIL_PORT,
        user: AppConfig.EMAIL_USER!,
        password: AppConfig.EMAIL_PASSWORD!,
        from: AppConfig.EMAIL_FROM || AppConfig.EMAIL_USER!,
        secure: AppConfig.EMAIL_SECURE,
      }),
      StripeService: new StripeServiceReal({
        secretKey: AppConfig.STRIPE_SECRET_KEY!,
        webhookSecret: AppConfig.STRIPE_WEBHOOK_SECRET || "",
      }),
      ShippingService: new ShippingServiceReal(),
    },
  }[env];

  return {
    ...envServices,
    PaymentStatusService: new PaymentStatusService(envServices.EmailService, envServices.ShippingService),
    HealthcheckService: new HealthcheckService(envServices.EmailService, envServices.StripeService, envServices.ShippingService),
  };
}
