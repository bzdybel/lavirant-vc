import type { Order } from "@shared/types/order";
import { storage } from "../storage";
import { getShipXClient, ShipXError } from "../../lib/inpost/shipxClient";
import type { ShipXShipmentDetails } from "../../lib/inpost/types";
import type { ShipmentOutput } from "./ShippingProvider";
import { InPostProvider } from "./InPostProvider";

function getProviderName(): string {
  return process.env.SHIPPING_PROVIDER || "INPOST";
}

function resolveProvider() {
  if (process.env.MOCK_INPOST === "true") {
    throw new Error("[CONFIG ERROR] MOCK_INPOST cannot be used in runtime or E2E mode");
  }
  if (getProviderName() !== "INPOST") {
    throw new Error("[CONFIG ERROR] Only INPOST provider is allowed in runtime");
  }
  return new InPostProvider();
}

export class ShippingService {
  async onOrderPaid(order: Order): Promise<ShipmentOutput | null> {
    console.log(`[OrderPaid] orderId=${order.id}`);
    const shipmentOutput = await this.ensureShipmentExists(order);
    const shipmentRecord = await storage.getShipmentByOrderId(order.id);
    if (!shipmentRecord?.providerShipmentId || shipmentRecord.boughtAt) {
      return shipmentOutput;
    }

    const resolvedOfferId = await this.ensureSelectedOfferId(order, shipmentRecord);
    if (!resolvedOfferId) {
      console.warn(`[ShipX] Shipment missing selected offer id orderId=${order.id} shipmentId=${shipmentRecord.providerShipmentId}`);
      return shipmentOutput;
    }

    if (shipmentRecord.buyError) {
      console.warn(`[ShipX] Shipment buy previously failed orderId=${order.id} shipmentId=${shipmentRecord.providerShipmentId}`);
      return shipmentOutput;
    }

    await this.buyShipment(order, shipmentRecord.providerShipmentId, resolvedOfferId, shipmentRecord.id);
    return shipmentOutput;
  }

  private async ensureShipmentExists(order: Order): Promise<ShipmentOutput | null> {
    const existing = await storage.getShipmentByOrderId(order.id);
    if (existing) {
      return {
        provider: existing.provider,
        trackingNumber: existing.trackingNumber,
        trackingUrl: existing.trackingUrl,
        status: existing.status === "SHIPPED" ? "SHIPPED" : "CREATED",
        shipmentId: existing.providerShipmentId ?? undefined,
      };
    }
    return this.createShipment(order);
  }

  private async ensureSelectedOfferId(order: Order, shipmentRecord: { id: number; providerShipmentId: string | null; selectedOfferId: string | null; status: string | null; }): Promise<string | null> {
    if (!shipmentRecord.providerShipmentId) return null;
    if (shipmentRecord.selectedOfferId) return shipmentRecord.selectedOfferId;

    try {
      const client = getShipXClient();
      const details = await client.request<ShipXShipmentDetails>(`/v1/shipments/${shipmentRecord.providerShipmentId}`, {
        method: "GET",
      });
      const selectedOfferId = details.selected_offer?.id ?? null;
      if (!selectedOfferId) return null;

      await storage.updateShipment(shipmentRecord.id, {
        selectedOfferId,
        status: details.status ?? shipmentRecord.status ?? undefined,
      });
      await storage.updateOrder(order.id, {
        shipmentStatus: details.status ?? order.shipmentStatus ?? shipmentRecord.status ?? undefined,
      });
      return selectedOfferId;
    } catch {
      console.warn(`[ShipX] Failed to refresh shipment offer for orderId=${order.id} shipmentId=${shipmentRecord.providerShipmentId ?? "unknown"}`);
      return null;
    }
  }

  private async buyShipment(order: Order, providerShipmentId: string, offerId: string, shipmentId: number): Promise<void> {
    console.log(`[ShipX] Buying shipment shipmentId=${providerShipmentId} offerId=${offerId}`);
    const client = getShipXClient();

    try {
      await client.request(`/v1/shipments/${providerShipmentId}/buy`, {
        method: "POST",
        body: JSON.stringify({ offer_id: offerId }),
      });

      const boughtAt = new Date().toISOString();
      await storage.updateShipment(shipmentId, {
        boughtAt,
        status: "buy_pending",
      });
      await storage.updateOrder(order.id, {
        shipmentStatus: "buy_pending",
      });
      console.log(`[ShipX] Shipment buy initiated shipmentId=${providerShipmentId}`);
    } catch (error) {
      const message = error instanceof ShipXError ? error.message : (error as Error).message;
      await storage.updateShipment(shipmentId, {
        buyError: message || "ShipX buy failed",
      });
      console.error(`[ShipX] Shipment buy failed shipmentId=${providerShipmentId}`);
    }
  }

  async createShipment(order: Order): Promise<ShipmentOutput | null> {
    const existing = await storage.getShipmentByOrderId(order.id);
    if (existing) {
      return {
        provider: existing.provider,
        trackingNumber: existing.trackingNumber,
        trackingUrl: existing.trackingUrl,
        status: existing.status === "SHIPPED" ? "SHIPPED" : "CREATED",
        shipmentId: existing.providerShipmentId ?? undefined,
      };
    }
    const provider = resolveProvider();
    const environment = (process.env.INPOST_SHIPX_ENV as string) || (process.env.NODE_ENV === "production" ? "production" : "sandbox");
    console.log(`[ShipX] Creating shipment via REAL ShipX sandbox orderId=${order.id} environment=${environment}`);
    const shipment = await provider.createShipment({ order });
    const normalizedStatus = shipment.status === "SHIPPED" ? "SHIPPED" : "CREATED";
    const shipxStatus = shipment.shipxStatus ?? shipment.status ?? "offer_selected";

    console.log(`[ShipX] Shipment created orderId=${order.id} providerShipmentId=${shipment.shipmentId ?? ""}`);

    await storage.createShipment({
      orderId: order.id,
      provider: shipment.provider,
      providerShipmentId: shipment.shipmentId ?? null,
      selectedOfferId: shipment.selectedOfferId ?? null,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      status: shipxStatus,
      boughtAt: null,
      buyError: null,
      createdAt: new Date().toISOString(),
      shippedAt: null,
    });

    await storage.updateOrder(order.id, {
      shipmentId: shipment.shipmentId ?? null,
      shipmentStatus: shipxStatus,
      trackingNumber: shipment.trackingNumber,
      labelGenerated: false,
    });

    return {
      ...shipment,
      status: normalizedStatus,
    };
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
