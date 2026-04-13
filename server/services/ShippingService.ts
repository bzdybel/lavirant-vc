import type { Order } from "@shared/types/order";
import { storage } from "../storage";
import { getShipXClient, ShipXError } from "../../lib/inpost/shipxClient";
import type { ShipXShipmentDetails } from "../../lib/inpost/types";
import type { ShipmentOutput } from "../shipping/ShippingProvider";
import { InPostProvider } from "../shipping/InPostProvider";
import { MockInPostProvider } from "../shipping/MockInPostProvider";
import { logger } from "../utils/logger";

export interface IShippingService {
  onOrderPaid(order: Order): Promise<ShipmentOutput | null>;
  createShipment(order: Order): Promise<ShipmentOutput | null>;
  markShipped(orderId: number): Promise<{ shipmentId: number; trackingNumber: string; trackingUrl: string } | null>;
  healthcheck(): Promise<boolean>;
}

export class ShippingServiceReal implements IShippingService {
  private readonly provider: InPostProvider;

  constructor() {
    this.provider = new InPostProvider();
  }

  async onOrderPaid(order: Order): Promise<ShipmentOutput | null> {
    logger.info({ message: "Order paid", metadata: { orderId: order.id } });

    const shipmentOutput = await this.ensureShipmentExists(order);
    const shipmentRecord = await storage.getShipmentByOrderId(order.id);

    if (!shipmentRecord?.providerShipmentId || shipmentRecord.boughtAt) {
      return shipmentOutput;
    }

    const resolvedOfferId = await this.ensureSelectedOfferId(order, shipmentRecord);

    if (!resolvedOfferId) {
      logger.warn({
        message: "Shipment missing selected offer",
        metadata: { orderId: order.id, providerShipmentId: shipmentRecord.providerShipmentId },
      });
      return shipmentOutput;
    }

    if (shipmentRecord.buyError) {
      logger.warn({
        message: "Shipment buy previously failed",
        metadata: { orderId: order.id, providerShipmentId: shipmentRecord.providerShipmentId },
      });
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
      logger.warn({
        message: "Failed to refresh shipment offer",
        metadata: { orderId: order.id, providerShipmentId: shipmentRecord.providerShipmentId ?? "unknown" },
      });
      return null;
    }
  }

  private async buyShipment(
    order: Order,
    providerShipmentId: string,
    offerId: string,
    shipmentId: number
  ): Promise<void> {
    logger.info({
      message: "Buying shipment",
      metadata: { providerShipmentId, offerId },
    });

    const client = getShipXClient();

    try {
      await client.request(`/v1/shipments/${providerShipmentId}/buy`, {
        method: "POST",
        body: JSON.stringify({ offer_id: offerId }),
      });

      const boughtAt = new Date().toISOString();

      await storage.updateShipment(shipmentId, { boughtAt, status: "buy_pending" });
      await storage.updateOrder(order.id, { shipmentStatus: "buy_pending" });

      logger.info({
        message: "Shipment buy initiated",
        metadata: { providerShipmentId },
      });
    } catch (error) {
      const message = error instanceof ShipXError ? error.message : (error as Error).message;
      await storage.updateShipment(shipmentId, { buyError: message || "ShipX buy failed" });
      logger.error({
        message: "Shipment buy failed",
        metadata: { providerShipmentId },
        error,
      });
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

    logger.info({
      message: "Creating shipment",
      metadata: { orderId: order.id },
    });

    const shipment = await this.provider.createShipment({ order });
    const normalizedStatus = shipment.status === "SHIPPED" ? "SHIPPED" : "CREATED";
    const shipxStatus = shipment.shipxStatus ?? shipment.status ?? "offer_selected";

    logger.info({
      message: "Shipment created",
      metadata: { orderId: order.id, providerShipmentId: shipment.shipmentId ?? "" },
    });

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

  async healthcheck(): Promise<boolean> {
    try {
      const client = getShipXClient();
      await client.request<unknown>("/v1/organizations?per_page=1");
      return true;
    } catch {
      return false;
    }
  }
}

export class ShippingServiceNoop implements IShippingService {
  private readonly provider: MockInPostProvider;

  constructor() {
    this.provider = new MockInPostProvider();
    logger.info({ message: "Shipping service initialized (noop)" });
  }

  async onOrderPaid(order: Order): Promise<ShipmentOutput | null> {
    logger.info({ message: "Order paid (noop)", metadata: { orderId: order.id } });
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

    logger.info({
      message: "Mock shipment created",
      metadata: { orderId: order.id, providerShipmentId: shipment.shipmentId ?? "" },
    });

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

  async healthcheck(): Promise<boolean> {
    return true;
  }
}

// Backward-compatible alias
export { ShippingServiceReal as ShippingService };
