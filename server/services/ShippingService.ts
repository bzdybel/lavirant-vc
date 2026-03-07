import type { Order } from "@shared/types/order";
import { storage } from "../storage";
import { getShipXClient, ShipXError } from "../../lib/inpost/shipxClient";
import type { ShipXShipmentDetails } from "../../lib/inpost/types";
import type { ShipmentOutput } from "../shipping/ShippingProvider";
import { InPostProvider } from "../shipping/InPostProvider";
import { MockInPostProvider } from "../shipping/MockInPostProvider";
import { LogPrefix } from "../constants/logPrefixes";

export interface IShippingService {
  onOrderPaid(order: Order): Promise<ShipmentOutput | null>;
  createShipment(order: Order): Promise<ShipmentOutput | null>;
  markShipped(orderId: number): Promise<{ shipmentId: number; trackingNumber: string; trackingUrl: string } | null>;
}

export class ShippingServiceReal implements IShippingService {
  private readonly provider: InPostProvider;

  constructor() {
    this.provider = new InPostProvider();
  }

  async onOrderPaid(order: Order): Promise<ShipmentOutput | null> {
    console.log(`${LogPrefix.ORDER_PAID} orderId=${order.id}`);

    const shipmentOutput = await this.ensureShipmentExists(order);
    const shipmentRecord = await storage.getShipmentByOrderId(order.id);

    if (!shipmentRecord?.providerShipmentId || shipmentRecord.boughtAt) {
      return shipmentOutput;
    }

    const resolvedOfferId = await this.ensureSelectedOfferId(order, shipmentRecord);

    if (!resolvedOfferId) {
      console.warn(
        `${LogPrefix.SHIPX} Shipment missing selected offer id orderId=${order.id} shipmentId=${shipmentRecord.providerShipmentId}`
      );
      return shipmentOutput;
    }

    if (shipmentRecord.buyError) {
      console.warn(
        `${LogPrefix.SHIPX} Shipment buy previously failed orderId=${order.id} shipmentId=${shipmentRecord.providerShipmentId}`
      );
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

  private async ensureSelectedOfferId(
    order: Order,
    shipmentRecord: { id: number; providerShipmentId: string | null; selectedOfferId: string | null; status: string | null }
  ): Promise<string | null> {
    if (!shipmentRecord.providerShipmentId) {
      return null;
    }

    if (shipmentRecord.selectedOfferId) {
      return shipmentRecord.selectedOfferId;
    }

    try {
      const client = getShipXClient();
      const details = await client.request<ShipXShipmentDetails>(
        `/v1/shipments/${shipmentRecord.providerShipmentId}`,
        { method: "GET" }
      );

      const selectedOfferId = details.selected_offer?.id ?? null;

      if (!selectedOfferId) {
        return null;
      }

      await storage.updateShipment(shipmentRecord.id, {
        selectedOfferId,
        status: details.status ?? shipmentRecord.status ?? undefined,
      });

      await storage.updateOrder(order.id, {
        shipmentStatus: details.status ?? order.shipmentStatus ?? shipmentRecord.status ?? undefined,
      });

      return selectedOfferId;
    } catch (_error) {
      console.warn(
        `${LogPrefix.SHIPX} Failed to refresh shipment offer for orderId=${order.id} shipmentId=${shipmentRecord.providerShipmentId ?? "unknown"}`
      );
      return null;
    }
  }

  private async buyShipment(
    order: Order,
    providerShipmentId: string,
    offerId: string,
    shipmentId: number
  ): Promise<void> {
    console.log(`${LogPrefix.SHIPX} Buying shipment shipmentId=${providerShipmentId} offerId=${offerId}`);

    const client = getShipXClient();

    try {
      await client.request(`/v1/shipments/${providerShipmentId}/buy`, {
        method: "POST",
        body: JSON.stringify({ offer_id: offerId }),
      });

      const boughtAt = new Date().toISOString();

      await storage.updateShipment(shipmentId, { boughtAt, status: "buy_pending" });
      await storage.updateOrder(order.id, { shipmentStatus: "buy_pending" });

      console.log(`${LogPrefix.SHIPX} Shipment buy initiated shipmentId=${providerShipmentId}`);
    } catch (error) {
      const message = error instanceof ShipXError ? error.message : (error as Error).message;
      await storage.updateShipment(shipmentId, { buyError: message || "ShipX buy failed" });
      console.error(`${LogPrefix.SHIPX} Shipment buy failed shipmentId=${providerShipmentId}`);
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

    console.log(`${LogPrefix.SHIPX} Creating shipment via ShipX orderId=${order.id}`);

    const shipment = await this.provider.createShipment({ order });
    const normalizedStatus = shipment.status === "SHIPPED" ? "SHIPPED" : "CREATED";
    const shipxStatus = shipment.shipxStatus ?? shipment.status ?? "offer_selected";

    console.log(`${LogPrefix.SHIPX} Shipment created orderId=${order.id} providerShipmentId=${shipment.shipmentId ?? ""}`);

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

    return { ...shipment, status: normalizedStatus };
  }

  async markShipped(orderId: number): Promise<{ shipmentId: number; trackingNumber: string; trackingUrl: string } | null> {
    const existing = await storage.getShipmentByOrderId(orderId);
    if (!existing) return null;

    const updated = await storage.updateShipment(existing.id, {
      status: "SHIPPED",
      shippedAt: new Date().toISOString(),
    });

    if (!updated) return null;

    return { shipmentId: updated.id, trackingNumber: updated.trackingNumber, trackingUrl: updated.trackingUrl };
  }
}

export class ShippingServiceNoop implements IShippingService {
  private readonly provider: MockInPostProvider;

  constructor() {
    this.provider = new MockInPostProvider();
    console.log("🧪 ShippingServiceNoop: using mock InPost provider");
  }

  async onOrderPaid(order: Order): Promise<ShipmentOutput | null> {
    console.log(`${LogPrefix.ORDER_PAID} [Noop] orderId=${order.id}`);
    return this.createShipment(order);
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

    const shipment = await this.provider.createShipment({ order });

    console.log(`${LogPrefix.SHIPX} [Noop] Mock shipment created orderId=${order.id} shipmentId=${shipment.shipmentId ?? ""}`);

    await storage.createShipment({
      orderId: order.id,
      provider: shipment.provider,
      providerShipmentId: shipment.shipmentId ?? null,
      selectedOfferId: null,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      status: "CREATED",
      boughtAt: null,
      buyError: null,
      createdAt: new Date().toISOString(),
      shippedAt: null,
    });

    await storage.updateOrder(order.id, {
      shipmentId: shipment.shipmentId ?? null,
      shipmentStatus: "CREATED",
      trackingNumber: shipment.trackingNumber,
      labelGenerated: false,
    });

    return { ...shipment, status: "CREATED" };
  }

  async markShipped(orderId: number): Promise<{ shipmentId: number; trackingNumber: string; trackingUrl: string } | null> {
    const existing = await storage.getShipmentByOrderId(orderId);
    if (!existing) return null;

    const updated = await storage.updateShipment(existing.id, {
      status: "SHIPPED",
      shippedAt: new Date().toISOString(),
    });

    if (!updated) return null;

    return { shipmentId: updated.id, trackingNumber: updated.trackingNumber, trackingUrl: updated.trackingUrl };
  }
}

// Backward-compatible alias
export { ShippingServiceReal as ShippingService };
