import { Cron } from "croner";
import pRetry from "p-retry";
import type { ShipXShipmentDetails } from "../../lib/inpost/types";
import { getShipXClient, ShipXError } from "../../lib/inpost/shipxClient";
import { storage } from "../storage";
import { updateOrderShipmentState } from "../inpost/shipxOrderUpdater";
import { AppConfig } from "../config/appConfig";
import { JobConfig } from "../constants/jobConfig";
import { LogPrefix } from "../constants/logPrefixes";

function shipxRetry<T>(action: () => Promise<T>): Promise<T> {
  return pRetry(action, {
    retries: JobConfig.SHIPX_RETRY_ATTEMPTS - 1,
    minTimeout: JobConfig.SHIPX_RETRY_BASE_DELAY_MS,
    factor: 1,
    shouldRetry: (error) => {
      if (error instanceof ShipXError) return error.status >= 500;
      if (error instanceof Error) return error.name === "FetchError" || error.name === "TypeError";
      return false;
    },
  });
}

/**
 * ShipX Polling Job
 *
 * Periodically polls ShipX for shipment status updates.
 * Single Responsibility: Synchronize shipment statuses with ShipX.
 */
export class ShipXPollingJob {
  private job: Cron | null = null;
  private consecutiveFailures = 0;

  /**
   * Starts the ShipX polling job
   */
  start(): void {
    if (!AppConfig.INPOST_API_SHIPX) {
      console.log("ℹ️ ShipX polling skipped: INPOST_API_SHIPX not configured.");
      return;
    }

    const intervalMinutes = JobConfig.SHIPX_POLL_INTERVAL_MINUTES;
    const pattern = `*/${intervalMinutes} * * * *`;

    this.job = new Cron(pattern, { protect: true }, () => {
      this.runJob()
        .then(() => {
          this.consecutiveFailures = 0;
        })
        .catch((error) => {
          this.consecutiveFailures++;
          if (this.consecutiveFailures >= JobConfig.SHIPX_CONSECUTIVE_FAILURE_ALERT_THRESHOLD) {
            console.error(
              `❌ [CRITICAL] ShipX polling failed ${this.consecutiveFailures} times consecutively:`,
              error
            );
          } else {
            console.error("❌ ShipX polling failed:", error);
          }
        });
    });

    // Run immediately; on failure retry once after a short delay (e.g. DB not yet ready at boot)
    this.job.trigger().catch((initialError) => {
      console.warn(
        `⚠️ ShipX polling initial run failed, retrying in ${JobConfig.SHIPX_INITIAL_TRIGGER_RETRY_DELAY_MS / 1000}s:`,
        initialError
      );
      setTimeout(() => {
        this.runJob()
          .then(() => {
            this.consecutiveFailures = 0;
          })
          .catch((retryError) => {
            this.consecutiveFailures++;
            console.error(
              `❌ ShipX polling initial retry also failed. Next attempt in ${intervalMinutes}min:`,
              retryError
            );
          });
      }, JobConfig.SHIPX_INITIAL_TRIGGER_RETRY_DELAY_MS);
    });
  }

  /**
   * Stops the polling job
   */
  stop(): void {
    this.job?.stop();
    this.job = null;
  }

  /**
   * Executes a single job run
   */
  private async runJob(): Promise<void> {
    const orders = await storage.listOrdersForShipmentPolling();

    if (orders.length === 0) {
      return;
    }

    const client = getShipXClient();
    const environment = AppConfig.INPOST_SHIPX_ENV;

    for (const order of orders) {
      await this.processShipment(order, client, environment);
    }
  }

  /**
   * Processes a single shipment
   */
  private async processShipment(
    order: any,
    client: ReturnType<typeof getShipXClient>,
    environment: string
  ): Promise<void> {
    if (!order.shipmentId) {
      return;
    }

    if (order.shipmentId.startsWith("MOCK-")) {
      console.warn(`${LogPrefix.SHIPX_POLLING} Skipping mock shipment id`, {
        orderId: order.id,
        shipmentId: order.shipmentId,
      });
      return;
    }

    console.log(`${LogPrefix.SHIPX_POLLING} Fetching shipment from sandbox`, {
      orderId: order.id,
      providerShipmentId: order.shipmentId,
      environment,
    });

    try {
      const shipment = await shipxRetry(() =>
        client.request<ShipXShipmentDetails>(
          `/v1/shipments/${order.shipmentId}`,
          { method: "GET" }
        )
      );

      await this.updateShipmentStatus(order, shipment, client);
      if (order.shipmentPollFailures > 0) {
        await storage.updateOrder(order.id, { shipmentPollFailures: 0 }).catch(() => {});
      }
    } catch (error) {
      const failures = order.shipmentPollFailures + 1;

      if (failures >= JobConfig.SHIPX_ORDER_MAX_POLL_FAILURES) {
        console.error(`❌ [CRITICAL] ShipX polling for order ${order.id} exceeded max failures (${failures}/${JobConfig.SHIPX_ORDER_MAX_POLL_FAILURES}), marking as polling_failed`, {
          orderId: order.id,
          shipmentId: order.shipmentId,
          error,
        });
        await updateOrderShipmentState(order, { shipmentStatus: "polling_failed" }).catch((markError) => {
          console.error("❌ Failed to mark order as polling_failed", { orderId: order.id, markError });
        });
      } else {
        console.error("❌ ShipX polling failed for shipment", {
          orderId: order.id,
          shipmentId: order.shipmentId,
          attempt: failures,
          maxAttempts: JobConfig.SHIPX_ORDER_MAX_POLL_FAILURES,
          error,
        });
        await storage.updateOrder(order.id, { shipmentPollFailures: failures }).catch(() => {});
      }
    }
  }

  /**
   * Updates shipment status from ShipX response
   */
  private async updateShipmentStatus(
    order: any,
    shipment: ShipXShipmentDetails,
    client: ReturnType<typeof getShipXClient>
  ): Promise<void> {
    const shipmentStatus = shipment.status ?? order.shipmentStatus ?? null;
    const trackingNumber = this.resolveTrackingNumber(shipment);

    let updatedOrder = await updateOrderShipmentState(order, {
      shipmentStatus,
      trackingNumber: trackingNumber ?? undefined,
    });

    const existingShipment = await storage.getShipmentByOrderId(order.id);

    if (existingShipment) {
      await storage.updateShipment(existingShipment.id, {
        status: shipmentStatus === "confirmed" ? "SHIPPED" : existingShipment.status,
        trackingNumber: trackingNumber ?? existingShipment.trackingNumber,
      });
    }

    // Handle label generation for confirmed shipments
    if (shipmentStatus === "confirmed" && updatedOrder.labelGenerated !== true) {
      await this.generateLabel(order, client, existingShipment);
    }
  }

  /**
   * Generates shipping label
   */
  private async generateLabel(
    order: any,
    client: ReturnType<typeof getShipXClient>,
    existingShipment: any
  ): Promise<void> {
    try {
      await shipxRetry(() =>
        client.requestBinary(
          `/v1/shipments/${order.shipmentId}/label?format=pdf`,
          { method: "GET" }
        )
      );

      await updateOrderShipmentState(order, {
        labelGenerated: true,
      });

      if (existingShipment) {
        await storage.updateShipment(existingShipment.id, {
          status: "SHIPPED",
        });
      }
    } catch (error) {
      console.error("❌ Failed to generate label for shipment", {
        orderId: order.id,
        shipmentId: order.shipmentId,
        error,
      });
    }
  }

  /**
   * Resolves tracking number from shipment data
   */
  private resolveTrackingNumber(shipment: ShipXShipmentDetails): string | null {
    return shipment.tracking_number || shipment.trackingNumber || null;
  }
}
