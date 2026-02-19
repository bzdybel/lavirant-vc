/**
 * @deprecated This file has been refactored
 * Import from server/services/StripeService.ts instead
 */

import { StripeService } from "./services/StripeService";
import type Stripe from "stripe";

// Singleton instance for backward compatibility
const stripeService = new StripeService();

export function isMockStripeEnabled(): boolean {
  return stripeService.isMockMode();
}

export function getStripeClient(): Stripe | null {
  return stripeService.isAvailable() ? stripeService.getClient() : null;
}

export function validateStripeConfig(): void {
  StripeService.validateConfiguration();
}
