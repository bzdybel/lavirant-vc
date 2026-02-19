import { storage } from "../storage";
import { StripeService } from "../services/StripeService";
import type { PaymentStatusService } from "../services/PaymentStatusService";
import { AppConfig } from "../config/appConfig";
import { LogPrefix } from "../constants/logPrefixes";

/**
 * Payment Status Job
 *
 * Polls pending payments and reconciles their status with Stripe.
 * Single Responsibility: Periodic payment status synchronization.
 */
export class PaymentStatusJob {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private readonly stripeService: StripeService,
    private readonly paymentStatusService: PaymentStatusService
  ) {}

  /**
   * Starts the payment status polling job
   */
  start(): void {
    if (!this.stripeService.isAvailable()) {
      console.log("ℹ️ Payment status job skipped: Stripe not configured or mock mode enabled.");
      return;
    }

    const intervalMs = AppConfig.PAYMENT_STATUS_JOB_INTERVAL_MINUTES * 60 * 1000;

    // Run immediately
    this.runJob().catch((error) => {
      console.error("❌ Payment status job initial run failed:", error);
    });

    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.runJob().catch((error) => {
        console.error("❌ Payment status job failed:", error);
      });
    }, intervalMs);
  }

  /**
   * Stops the payment status job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Executes a single job run
   */
  private async runJob(): Promise<void> {
    const startedAt = new Date().toISOString();
    const pendingOrders = await storage.listOrdersByStatus("PAYMENT_PENDING" as any);
    const cutoffTime = Date.now() - AppConfig.PAYMENT_PENDING_THRESHOLD_MINUTES * 60 * 1000;
    const dryRun = AppConfig.PAYMENT_STATUS_JOB_DRY_RUN;

    console.log("🔎 Payment status job run", {
      startedAt,
      dryRun,
      pendingOrders: pendingOrders.length,
      pendingThresholdMinutes: AppConfig.PAYMENT_PENDING_THRESHOLD_MINUTES,
    });

    for (const order of pendingOrders) {
      await this.processOrder(order, cutoffTime, dryRun);
    }
  }

  /**
   * Processes a single pending order
   */
  private async processOrder(
    order: any,
    cutoffTime: number,
    dryRun: boolean
  ): Promise<void> {
    const createdAt = new Date(order.paymentPendingAt || order.createdAt).getTime();
    const isEligible = createdAt <= cutoffTime && Boolean(order.paymentIntentId);

    console.log("📦 Checking order", {
      orderId: order.id,
      paymentIntentId: order.paymentIntentId,
      paymentPendingAt: order.paymentPendingAt,
      createdAt: order.createdAt,
      eligible: isEligible,
    });

    if (!isEligible) {
      return;
    }

    try {
      const paymentIntent = await this.stripeService.retrievePaymentIntent(order.paymentIntentId);
      const mappedStatus = StripeService.mapStripeStatus(paymentIntent.status);

      console.log(`${LogPrefix.PAYMENT} Payment intent retrieved`, {
        orderId: order.id,
        paymentIntentId: paymentIntent.id,
        stripeStatus: paymentIntent.status,
        mappedStatus,
        dryRun,
      });

      if (dryRun) {
        return;
      }

      const product = order.productId ? await storage.getProduct(order.productId) : undefined;

      await this.paymentStatusService.applyPaymentStatusUpdate({
        order,
        status: mappedStatus,
        paymentReference: paymentIntent.id,
        paymentProvider: "stripe",
        product,
      });
    } catch (error) {
      console.error(`❌ Payment status job failed for order ${order.id}:`, error);
    }
  }
}
