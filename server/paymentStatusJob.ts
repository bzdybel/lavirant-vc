import { storage } from "./storage";
import { stripe, USE_MOCK_STRIPE } from "./stripeClient";
import { applyPaymentStatusUpdate } from "./paymentStatusService";

const DEFAULT_INTERVAL_MINUTES = 45;
const DEFAULT_PENDING_THRESHOLD_MINUTES = 120;

function parseMinutes(value: string | undefined, fallback: number): number {
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function mapStripeStatus(status: string): "COMPLETED" | "PENDING" | "FAILED" {
  switch (status) {
    case "succeeded":
      return "COMPLETED";
    case "canceled":
    case "requires_payment_method":
      return "FAILED";
    default:
      return "PENDING";
  }
}

export function startPaymentStatusJob() {
  const intervalMinutes = parseMinutes(process.env.PAYMENT_STATUS_JOB_INTERVAL_MINUTES, DEFAULT_INTERVAL_MINUTES);
  const pendingThresholdMinutes = parseMinutes(process.env.PAYMENT_PENDING_THRESHOLD_MINUTES, DEFAULT_PENDING_THRESHOLD_MINUTES);

  if (USE_MOCK_STRIPE || !stripe) {
    console.log("ℹ️ Payment status job skipped: Stripe not configured or mock mode enabled.");
    return;
  }

  const stripeClient = stripe;

  const intervalMs = intervalMinutes * 60 * 1000;

  const run = async () => {
    const pendingOrders = await storage.listOrdersByStatus("PAYMENT_PENDING");
    const cutoff = Date.now() - pendingThresholdMinutes * 60 * 1000;

    for (const order of pendingOrders) {
      const createdAt = new Date(order.paymentPendingAt || order.createdAt).getTime();
      if (createdAt > cutoff || !order.paymentIntentId) continue;

      try {
        const paymentIntent = await stripeClient.paymentIntents.retrieve(order.paymentIntentId);
        const mappedStatus = mapStripeStatus(paymentIntent.status);

        const product = order.productId ? await storage.getProduct(order.productId) : undefined;
        await applyPaymentStatusUpdate({
          order,
          status: mappedStatus,
          paymentReference: paymentIntent.id,
          paymentProvider: "stripe",
          product,
        });
      } catch (error) {
        console.error("❌ Payment status job failed for order", order.id, error);
      }
    }
  };

  run().catch((error) => {
    console.error("❌ Payment status job initial run failed:", error);
  });

  setInterval(() => {
    run().catch((error) => {
      console.error("❌ Payment status job failed:", error);
    });
  }, intervalMs);
}
