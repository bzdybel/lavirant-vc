import type { Order } from "@shared/schema";
import { storage } from "../storage";
import type { ShipmentOutput } from "./ShippingProvider";
import { MockInPostProvider } from "./MockInPostProvider";

const PROVIDER = process.env.SHIPPING_PROVIDER || "MOCK_INPOST";

const providers = {
  MOCK_INPOST: new MockInPostProvider(),
};

function resolveProvider() {
  if (PROVIDER === "INPOST") {
    return providers.MOCK_INPOST;
  }
  return providers.MOCK_INPOST;
}

export class ShippingService {
  async createShipment(order: Order): Promise<ShipmentOutput | null> {
    const existing = await storage.getShipmentByOrderId(order.id);
    if (existing) {
      return {
        provider: existing.provider,
        trackingNumber: existing.trackingNumber,
        trackingUrl: existing.trackingUrl,
        status: existing.status === "SHIPPED" ? "SHIPPED" : "CREATED",
      };
    }

    const provider = resolveProvider();
    const shipment = await provider.createShipment({ order });

    await storage.createShipment({
      orderId: order.id,
      provider: shipment.provider,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      status: shipment.status,
      createdAt: new Date().toISOString(),
      shippedAt: null,
    });

    return shipment;
  }

  async markShipped(orderId: number): Promise<{ shipmentId: number; trackingNumber: string; trackingUrl: string } | null> {
    const existing = await storage.getShipmentByOrderId(orderId);
    if (!existing) return null;

    const updated = await storage.updateShipment(existing.id, {
      status: "SHIPPED",
      shippedAt: new Date().toISOString(),
    });

    if (!updated) return null;

    return {
      shipmentId: updated.id,
      trackingNumber: updated.trackingNumber,
      trackingUrl: updated.trackingUrl,
    };
  }
}

export const shippingService = new ShippingService();
