import type { ShipXShipmentDetails } from "../../lib/inpost/types";
import { getShipXClient, ShipXError } from "../../lib/inpost/shipxClient";
import { storage } from "../storage";
import { updateOrderShipmentState } from "../inpost/shipxOrderUpdater";
import { AppConfig } from "../config/appConfig";
import { JobConfig } from "../constants/jobConfig";
import { LogPrefix } from "../constants/logPrefixes";

/**
 * Retry Utility
 */
class RetryHelper {
  static async withRetry<T>(
    action: () => Promise<T>,
    maxAttempts: number = JobConfig.SHIPX_RETRY_ATTEMPTS,
    baseDelayMs: number = JobConfig.SHIPX_RETRY_BASE_DELAY_MS
  ): Promise<T> {
    let attempt = 0;

    while (true) {
      try {
        return await action();
      } catch (error) {
        attempt += 1;

        if (!this.isRetryableError(error) || attempt >= maxAttempts) {
          throw error;
        }

        const backoff = baseDelayMs * attempt;
        await this.delay(backoff);
      }
    }
  }

  private static isRetryableError(error: unknown): boolean {
    if (error instanceof ShipXError) {
      return error.status >= 500;
    }

    if (error instanceof Error) {
      return error.name === "FetchError" || error.name === "TypeError";
    }

    return false;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * ShipX Polling Job
 *
 * Periodically polls ShipX for shipment status updates.
 * Single Responsibility: Synchronize shipment statuses with ShipX.
 */
export class ShipXPollingJob {
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Starts the ShipX polling job
   */
  start(): void {
    if (!AppConfig.INPOST_API_SHIPX) {
      console.log("ℹ️ ShipX polling skipped: INPOST_API_SHIPX not configured.");
      return;
    }

    const intervalMs = JobConfig.SHIPX_POLL_INTERVAL_MINUTES * 60 * 1000;

    // Run immediately
    this.runJob().catch((error) => {
      console.error("❌ ShipX polling initial run failed:", error);
    });

    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.runJob().catch((error) => {
        console.error("❌ ShipX polling failed:", error);
      });
    }, intervalMs);
  }

  /**
   * Stops the polling job
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
      const shipment = await RetryHelper.withRetry(() =>
        client.request<ShipXShipmentDetails>(
          `/v1/shipments/${order.shipmentId}`,
          { method: "GET" }
        )
      );

      await this.updateShipmentStatus(order, shipment, client);
    } catch (error) {
      console.error("❌ ShipX polling failed for shipment", {
        orderId: order.id,
        shipmentId: order.shipmentId,
        error,
      });
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
      await RetryHelper.withRetry(() =>
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
