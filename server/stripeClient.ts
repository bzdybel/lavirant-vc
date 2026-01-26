import Stripe from "stripe";

export const USE_MOCK_STRIPE = process.env.USE_MOCK_STRIPE === "true";

if (!process.env.STRIPE_SECRET_KEY && !USE_MOCK_STRIPE) {
  console.warn("Missing STRIPE_SECRET_KEY environment variable. Payment functionality will be disabled.");
}

export const stripe = (process.env.STRIPE_SECRET_KEY && !USE_MOCK_STRIPE)
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" })
  : null;

if (USE_MOCK_STRIPE) {
  console.log("🔧 Running in MOCK STRIPE mode for development");
}
