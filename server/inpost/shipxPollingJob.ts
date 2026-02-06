import type { ShipXShipmentDetails } from "../../lib/inpost/types";
import { getShipXClient, ShipXError } from "../../lib/inpost/shipxClient";
import { storage } from "../storage";
import { updateOrderShipmentState } from "./shipxOrderUpdater";

const POLL_INTERVAL_MINUTES = 10;
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof ShipXError) {
    return error.status >= 500;
  }

  if (error instanceof Error) {
    return error.name === "FetchError" || error.name === "TypeError";
  }

  return false;
}

async function withRetry<T>(action: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await action();
    } catch (error) {
      attempt += 1;
      if (!isRetryableError(error) || attempt >= RETRY_ATTEMPTS) {
        throw error;
      }
      const backoff = RETRY_BASE_DELAY_MS * attempt;
      await delay(backoff);
    }
  }
}

function resolveTrackingNumber(shipment: ShipXShipmentDetails): string | null {
  return shipment.tracking_number || shipment.trackingNumber || null;
}

export async function pollShipXShipments(): Promise<void> {
  const token = process.env.INPOST_API_SHIPX;
  if (!token) {
    console.log("ℹ️ ShipX polling skipped: INPOST_API_SHIPX not configured.");
    return;
  }

  const orders = await storage.listOrdersForShipmentPolling();
  if (orders.length === 0) return;

  const client = getShipXClient();

  for (const order of orders) {
    if (!order.shipmentId) continue;

    try {
      const shipment = await withRetry(() =>
        client.request<ShipXShipmentDetails>(`/v1/shipments/${order.shipmentId}`, {
          method: "GET",
        })
      );

      const shipmentStatus = shipment.status ?? order.shipmentStatus ?? null;
      const trackingNumber = resolveTrackingNumber(shipment);

      let updatedOrder = await updateOrderShipmentState(order, {
        shipmentStatus,
        trackingNumber: trackingNumber ?? undefined,
      });

      if (
        shipmentStatus === "confirmed" &&
        updatedOrder.labelGenerated !== true
      ) {
        await withRetry(() =>
          client.requestBinary(
            `/v1/shipments/${order.shipmentId}/label?format=pdf`,
            { method: "GET" }
          )
        );

        updatedOrder = await updateOrderShipmentState(updatedOrder, {
          labelGenerated: true,
        });
      }
    } catch (error) {
      console.error("❌ ShipX polling failed for shipment", {
        orderId: order.id,
        shipmentId: order.shipmentId,
        error,
      });
    }
  }
}

export function startShipXPollingJob() {
  const intervalMs = POLL_INTERVAL_MINUTES * 60 * 1000;

  pollShipXShipments().catch((error) => {
    console.error("❌ ShipX polling initial run failed:", error);
  });

  setInterval(() => {
    pollShipXShipments().catch((error) => {
      console.error("❌ ShipX polling failed:", error);
    });
  }, intervalMs);
}
