import Stripe from "stripe";

let stripeInstance: Stripe | null | undefined;

export function isMockStripeEnabled(): boolean {
  return process.env.USE_MOCK_STRIPE === "true";
}

export function getStripeClient(): Stripe | null {
  if (stripeInstance !== undefined) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || isMockStripeEnabled()) {
    stripeInstance = null;
    return stripeInstance;
  }

  stripeInstance = new Stripe(secretKey, { apiVersion: "2025-04-30.basil" });
  return stripeInstance;
}

export function validateStripeConfig(): void {
  const useMockStripe = isMockStripeEnabled();
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey && !useMockStripe) {
    console.warn("Missing STRIPE_SECRET_KEY environment variable. Payment functionality will be disabled.");
  }

  if (useMockStripe) {
    console.log("🔧 Running in MOCK STRIPE mode for development");
  }
}
