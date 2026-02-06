import type { Order } from "@shared/schema";

export type ShipmentStatus = "CREATED" | "SHIPPED";

export interface ShipmentInput {
  order: Order;
}

export interface ShipmentOutput {
  provider: string;
  trackingNumber: string;
  trackingUrl: string;
  status: ShipmentStatus;
  shipmentId?: string;
  shipxStatus?: string | null;
  selectedOfferId?: string | null;
}

export interface ShippingProvider {
  createShipment(input: ShipmentInput): Promise<ShipmentOutput>;
  getTrackingUrl(trackingNumber: string): string;
}
