import type { Order } from "@shared/schema";
import { storage } from "../storage";

export interface ShipmentUpdateInput {
  shipmentStatus?: string | null;
  trackingNumber?: string | null;
  labelGenerated?: boolean;
}

export async function updateOrderShipmentState(
  order: Order,
  update: ShipmentUpdateInput
): Promise<Order> {
  const patch: ShipmentUpdateInput = {};

  if (
    typeof update.shipmentStatus !== "undefined" &&
    update.shipmentStatus !== order.shipmentStatus
  ) {
    patch.shipmentStatus = update.shipmentStatus;
  }

  if (
    typeof update.trackingNumber !== "undefined" &&
    update.trackingNumber !== order.trackingNumber
  ) {
    patch.trackingNumber = update.trackingNumber;
  }

  if (
    typeof update.labelGenerated !== "undefined" &&
    update.labelGenerated !== order.labelGenerated
  ) {
    patch.labelGenerated = update.labelGenerated;
  }

  if (Object.keys(patch).length === 0) {
    return order;
  }

  const updated = await storage.updateOrder(order.id, patch);
  return updated ?? order;
}
