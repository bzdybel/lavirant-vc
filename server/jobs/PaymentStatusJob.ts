import { storage } from "../storage";
import { type IStripeService, mapStripeStatus } from "../services/StripeService";
import type { PaymentStatusService } from "../services/PaymentStatusService";
import { AppConfig } from "../config/appConfig";
import { logger } from "../utils/logger";

export function newPaymentStatusJob(
  stripeService: IStripeService,
  paymentStatusService: PaymentStatusService
) {
  async function handle(): Promise<void> {
    try {
      const startedAt = new Date().toISOString();
      const pendingOrders = await storage.listOrdersByStatus("PAYMENT_PENDING" as any);
      const cutoffTime = Date.now() - AppConfig.PAYMENT_PENDING_THRESHOLD_MINUTES * 60 * 1000;
      const dryRun = AppConfig.PAYMENT_STATUS_JOB_DRY_RUN;

      logger.info({
        message: "Payment status job started",
        metadata: { startedAt, dryRun, pendingOrders: pendingOrders.length, pendingThresholdMinutes: AppConfig.PAYMENT_PENDING_THRESHOLD_MINUTES },
      });

      for (const order of pendingOrders) {
        await processOrder(order, cutoffTime, dryRun);
      }
    } catch (error) {
      logger.error({ message: "Payment status job failed", error });
    }
  }

  async function processOrder(
    order: any,
    cutoffTime: number,
    dryRun: boolean
  ): Promise<void> {
    const createdAt = new Date(order.paymentPendingAt || order.createdAt).getTime();
    const isEligible = createdAt <= cutoffTime && Boolean(order.paymentIntentId);

    logger.info({
      message: "Payment status order check",
      metadata: { orderId: order.id, paymentIntentId: order.paymentIntentId, paymentPendingAt: order.paymentPendingAt, createdAt: order.createdAt, eligible: isEligible },
    });

    if (!isEligible) {
      return;
    }

    try {
      const paymentIntent = await stripeService.retrievePaymentIntent(order.paymentIntentId);
      const mappedStatus = mapStripeStatus(paymentIntent.status);

      logger.info({
        message: "Payment intent retrieved",
        metadata: { orderId: order.id, paymentIntentId: paymentIntent.id, stripeStatus: paymentIntent.status, mappedStatus, dryRun },
      });

      if (dryRun) {
        return;
      }

      const product = order.productId ? await storage.getProduct(order.productId) : undefined;

      await paymentStatusService.applyPaymentStatusUpdate({
        order,
        status: mappedStatus,
        paymentReference: paymentIntent.id,
        paymentProvider: "stripe",
        product,
      });
    } catch (error) {
      logger.error({ message: "Payment status job failed for order", metadata: { orderId: order.id }, error });
    }
  }

  return { handle };
}
