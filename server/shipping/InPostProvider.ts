import type { ShippingProvider, ShipmentInput, ShipmentOutput } from "./ShippingProvider";

interface ShipXShipmentResponse {
  id?: string;
  status?: string;
  tracking_number?: string;
  trackingNumber?: string;
  tracking_id?: string;
}

interface InPostConfig {
  baseUrl: string;
  token: string;
  serviceLocker: string;
  serviceCourier: string;
  parcelTemplate: string;
  sender: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

function resolveEnv(name: string, fallback = ""): string {
  return (process.env[name] || fallback).trim();
}

function getConfig(): InPostConfig | null {
  const token = resolveEnv("INPOST_API_SHIPX");
  if (!token) return null;

  return {
    baseUrl: resolveEnv("INPOST_SHIPX_API_BASE", "https://api-shipx-pl.easypack24.net/v1"),
    token,
    serviceLocker: resolveEnv("INPOST_SERVICE_LOCKER", "inpost_locker_standard"),
    serviceCourier: resolveEnv("INPOST_SERVICE_COURIER", "inpost_courier_standard"),
    parcelTemplate: resolveEnv("INPOST_PARCEL_TEMPLATE", "small"),
    sender: {
      name: resolveEnv("INPOST_SENDER_NAME", resolveEnv("INVOICE_SELLER_NAME", "Lavirant")),
      email: resolveEnv("INPOST_SENDER_EMAIL", resolveEnv("INVOICE_SELLER_EMAIL", "zamowienia@lavirant.pl")),
      phone: resolveEnv("INPOST_SENDER_PHONE", "+48000000000"),
      address: resolveEnv("INPOST_SENDER_ADDRESS", resolveEnv("INVOICE_SELLER_ADDRESS", "")),
      city: resolveEnv("INPOST_SENDER_CITY", "Warszawa"),
      postalCode: resolveEnv("INPOST_SENDER_POSTAL_CODE", "00-001"),
      country: resolveEnv("INPOST_SENDER_COUNTRY", "PL"),
    },
  };
}

function buildTrackingUrl(trackingNumber: string): string {
  return `https://tracking.inpost.pl/?number=${encodeURIComponent(trackingNumber)}`;
}

function normalizeCountryCode(value: string | null | undefined): string {
  const normalized = (value || "").trim().toUpperCase();
  if (!normalized || normalized === "POLSKA" || normalized === "POLAND") {
    return "PL";
  }
  return normalized.length === 2 ? normalized : "PL";
}

function normalizeTrackingNumber(payload: ShipXShipmentResponse): string {
  return (
    payload.tracking_number ||
    payload.trackingNumber ||
    payload.tracking_id ||
    payload.id ||
    ""
  );
}

export class InPostProvider implements ShippingProvider {
  private config: InPostConfig;

  constructor() {
    const config = getConfig();
    if (!config) {
      throw new Error("INPOST_API_SHIPX is not configured");
    }
    this.config = config;
  }

  async createShipment({ order }: ShipmentInput): Promise<ShipmentOutput> {
    const deliveryMethod = order.deliveryMethod
      || (order.deliveryPointId ? "INPOST_PACZKOMAT" : "INPOST_KURIER");
    const isLocker = deliveryMethod === "INPOST_PACZKOMAT";

    const receiver = {
      name: `${order.firstName} ${order.lastName}`,
      email: order.email,
      phone: order.phone,
      address: isLocker
        ? undefined
        : {
            street: order.address,
            city: order.city,
            post_code: order.postalCode,
        country_code: normalizeCountryCode(order.country),
          },
    };

    const sender = {
      name: this.config.sender.name,
      email: this.config.sender.email,
      phone: this.config.sender.phone,
      address: {
        street: this.config.sender.address,
        city: this.config.sender.city,
        post_code: this.config.sender.postalCode,
        country_code: normalizeCountryCode(this.config.sender.country),
      },
    };

    const shipmentPayload = {
      service: isLocker ? this.config.serviceLocker : this.config.serviceCourier,
      reference: `order-${order.id}`,
      comments: `Order ${order.id}`,
      receiver,
      sender,
      parcels: [{ template: this.config.parcelTemplate }],
      custom_attributes: isLocker
        ? {
            target_point: order.deliveryPointId,
          }
        : undefined,
    };

    if (isLocker && !order.deliveryPointId) {
      throw new Error("Missing InPost delivery point for parcel locker shipment");
    }

    const response = await fetch(`${this.config.baseUrl}/shipments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.token}`,
      },
      body: JSON.stringify(shipmentPayload),
    });

    const responseText = await response.text();
    let responseJson: ShipXShipmentResponse = {};
    if (responseText) {
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        responseJson = {};
      }
    }

    if (!response.ok) {
      throw new Error(
        `InPost ShipX error (${response.status}): ${responseText || response.statusText}`,
      );
    }

    const shipmentId = responseJson.id;
    if (!shipmentId) {
      throw new Error("InPost ShipX response missing shipment id");
    }

    const trackingNumber = normalizeTrackingNumber(responseJson);
    if (!trackingNumber) {
      throw new Error("InPost ShipX response missing tracking number");
    }

    return {
      provider: "INPOST",
      trackingNumber,
      trackingUrl: buildTrackingUrl(trackingNumber),
      status: responseJson.status || "CREATED",
      shipmentId,
    };
  }

  getTrackingUrl(trackingNumber: string): string {
    return buildTrackingUrl(trackingNumber);
  }
}
