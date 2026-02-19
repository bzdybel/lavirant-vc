/**
 * @deprecated This file has been refactored
 * Import from server/jobs/PaymentStatusJob.ts instead
 */

import { PaymentStatusJob } from "./jobs/PaymentStatusJob";
import { StripeService } from "./services/StripeService";
import { PaymentStatusService } from "./services/PaymentStatusService";
import { EmailService } from "./services/EmailService";
import { ShippingService } from "./services/ShippingService";

// Initialize services
const stripeService = new StripeService();
const emailService = new EmailService();
const shippingService = new ShippingService();
const paymentStatusService = new PaymentStatusService(emailService, shippingService);

// Create job instance
const paymentStatusJob = new PaymentStatusJob(stripeService, paymentStatusService);

/**
 * Starts the payment status job
 * @deprecated Use PaymentStatusJob class instance instead
 */
export function startPaymentStatusJob(): void {
  paymentStatusJob.start();
}

/**
 * Starts the payment status job
 * @deprecated Use PaymentStatusJob class instance instead
 */
export function startPaymentStatusJob(): void {
  paymentStatusJob.start();
}
