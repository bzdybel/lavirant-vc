import { type IEmailService, EmailServiceReal, EmailServiceNoop } from "./EmailService";
import { type IStripeService, StripeServiceReal, StripeServiceNoop } from "./StripeService";
import { type IShippingService, ShippingServiceReal, ShippingServiceNoop } from "./ShippingService";
import { PaymentStatusService } from "./PaymentStatusService";
import { AppConfig } from "../config/appConfig";

let _emailService: IEmailService | null = null;
let _stripeService: IStripeService | null = null;
let _shippingService: IShippingService | null = null;
let _paymentStatusService: PaymentStatusService | null = null;

export function initializeServices() {
  if (!_emailService) {
    _emailService = AppConfig.isEmailConfigured()
      ? new EmailServiceReal({
          host: AppConfig.EMAIL_HOST!,
          port: AppConfig.EMAIL_PORT,
          user: AppConfig.EMAIL_USER!,
          password: AppConfig.EMAIL_PASSWORD!,
          from: AppConfig.EMAIL_FROM || AppConfig.EMAIL_USER!,
          secure: AppConfig.EMAIL_SECURE,
        })
      : new EmailServiceNoop();
  }
  if (!_stripeService) {
    _stripeService = AppConfig.USE_MOCK_STRIPE || !AppConfig.STRIPE_SECRET_KEY
      ? new StripeServiceNoop()
      : new StripeServiceReal({
          secretKey: AppConfig.STRIPE_SECRET_KEY,
          webhookSecret: AppConfig.STRIPE_WEBHOOK_SECRET || "",
        });
  }
  if (!_shippingService) {
    _shippingService = AppConfig.MOCK_INPOST || AppConfig.SHIPPING_PROVIDER !== "INPOST"
      ? new ShippingServiceNoop()
      : new ShippingServiceReal();
  }
  if (!_paymentStatusService) {
    _paymentStatusService = new PaymentStatusService(_emailService, _shippingService);
  }
}

export function getEmailService(): IEmailService {
  if (!_emailService) {
    initializeServices();
  }
  return _emailService!;
}

export function getStripeService(): IStripeService {
  if (!_stripeService) {
    initializeServices();
  }
  return _stripeService!;
}

export function getShippingService(): IShippingService {
  if (!_shippingService) {
    initializeServices();
  }
  return _shippingService!;
}

export function getPaymentStatusService(): PaymentStatusService {
  if (!_paymentStatusService) {
    initializeServices();
  }
  return _paymentStatusService!;
}
