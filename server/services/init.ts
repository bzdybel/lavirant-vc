/**
 * Services Singleton Initialization
 * 
 * This module creates and exports singleton instances of all services.
 * This ensures a single instance of each service is used throughout the application.
 */

import { EmailService } from "./EmailService";
import { StripeService } from "./StripeService";
import { ShippingService } from "./ShippingService";
import { PaymentStatusService } from "./PaymentStatusService";

// Create singleton instances
export const emailService = new EmailService();
export const stripeService = new StripeService();
export const shippingService = new ShippingService();
export const paymentStatusService = new PaymentStatusService(emailService, shippingService);
