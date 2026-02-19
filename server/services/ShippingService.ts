import type { Order } from "@shared/types/order";
import { storage } from "../storage";
import { getShipXClient, ShipXError } from "../../lib/inpost/shipxClient";
import type { ShipXShipmentDetails } from "../../lib/inpost/types";
import type { ShipmentOutput } from "../shipping/ShippingProvider";
import { InPostProvider } from "../shipping/InPostProvider";
import { AppConfig } from "../config/appConfig";
import { LogPrefix } from "../constants/logPrefixes";
import { ConfigurationError } from "../errors/AppError";

/**
 * Shipping Service
 *
 * Manages shipment creation, purchasing, and status updates.
 * Single Responsibility: Orchestrate shipping workflows with providers.
 */
export class ShippingService {
  private readonly provider: InPostProvider;

  constructor() {
    this.provider = this.initializeProvider();
  }

  /**
   * Initializes the shipping provider
   */
  private initializeProvider(): InPostProvider {
    if (AppConfig.MOCK_INPOST) {
      throw new ConfigurationError("MOCK_INPOST cannot be used in runtime or E2E mode");
    }

    if (AppConfig.SHIPPING_PROVIDER !== "INPOST") {
      throw new ConfigurationError("Only INPOST provider is allowed in runtime");
    }

    return new InPostProvider();
  }

  /**
   * Handles post-payment shipment workflow
   */
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

  /**
   * Ensures shipment exists for order, creating if necessary
   */
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

  /**
   * Ensures shipment has a selected offer ID, fetching if necessary
   */
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

  /**
   * Purchases a shipment with InPost
   */
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

      await storage.updateShipment(shipmentId, {
        boughtAt,
        status: "buy_pending",
      });

      await storage.updateOrder(order.id, {
        shipmentStatus: "buy_pending",
      });

      console.log(`${LogPrefix.SHIPX} Shipment buy initiated shipmentId=${providerShipmentId}`);
    } catch (error) {
      const message = error instanceof ShipXError ? error.message : (error as Error).message;

      await storage.updateShipment(shipmentId, {
        buyError: message || "ShipX buy failed",
      });

      console.error(`${LogPrefix.SHIPX} Shipment buy failed shipmentId=${providerShipmentId}`);
    }
  }

  /**
   * Creates a new shipment for an order
   */
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

    const environment = AppConfig.INPOST_SHIPX_ENV;
    console.log(`${LogPrefix.SHIPX} Creating shipment via REAL ShipX sandbox orderId=${order.id} environment=${environment}`);

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

    return {
      ...shipment,
      status: normalizedStatus,
    };
  }

  /**
   * Marks a shipment as shipped
   */
  async markShipped(orderId: number): Promise<{ shipmentId: number; trackingNumber: string; trackingUrl: string } | null> {
    const existing = await storage.getShipmentByOrderId(orderId);

    if (!existing) {
      return null;
    }

    const updated = await storage.updateShipment(existing.id, {
      status: "SHIPPED",
      shippedAt: new Date().toISOString(),
    });

    if (!updated) {
      return null;
    }

    return {
      shipmentId: updated.id,
      trackingNumber: updated.trackingNumber,
      trackingUrl: updated.trackingUrl,
    };
  }
}
