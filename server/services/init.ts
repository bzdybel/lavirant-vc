import { EmailService } from "./EmailService";
import { StripeService } from "./StripeService";
import { ShippingService } from "./ShippingService";
import { PaymentStatusService } from "./PaymentStatusService";

let _emailService: EmailService | null = null;
let _stripeService: StripeService | null = null;
let _shippingService: ShippingService | null = null;
let _paymentStatusService: PaymentStatusService | null = null;

export function initializeServices() {
  if (!_emailService) {
    _emailService = new EmailService();
  }
  if (!_stripeService) {
    _stripeService = new StripeService();
  }
  if (!_shippingService) {
    _shippingService = new ShippingService();
  }
  if (!_paymentStatusService) {
    _paymentStatusService = new PaymentStatusService(_emailService, _shippingService);
  }
}

export function getEmailService(): EmailService {
  if (!_emailService) {
    initializeServices();
  }
  return _emailService!;
}

export function getStripeService(): StripeService {
  if (!_stripeService) {
    initializeServices();
  }
  return _stripeService!;
}

export function getShippingService(): ShippingService {
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
