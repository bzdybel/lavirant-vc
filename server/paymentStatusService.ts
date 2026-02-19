/**
 * @deprecated This file has been refactored
 * Import from server/services/PaymentStatusService.ts instead
 */

 export { PaymentStatusService, type PaymentUpdateParams } from "./services/PaymentStatusService";

// Re-export for backward compatibility
export type { PaymentWebhookStatusType as PaymentWebhookStatus } from "./constants/paymentStatus";

// Legacy function for backward compatibility
import { PaymentStatusService } from "./services/PaymentStatusService";
import { EmailService } from "./services/EmailService";
import { ShippingService } from "./services/ShippingService";
import type { PaymentUpdateParams } from "./services/PaymentStatusService";
import type { PaymentWebhookStatusType } from "./constants/paymentStatus";

// Initialize services (will be properly done in main app now)
const emailService = new EmailService();
const shippingService = new ShippingService();
const paymentStatusService = new PaymentStatusService(emailService, shippingService);

export async function applyPaymentStatusUpdate(params: PaymentUpdateParams) {
  return paymentStatusService.applyPaymentStatusUpdate(params);
}
