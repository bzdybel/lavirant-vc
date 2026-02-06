import type { ShippingProvider, ShipmentInput, ShipmentOutput } from "./ShippingProvider";
import { getShipXClient } from "../../lib/inpost/shipxClient";

interface ShipXShipmentResponse {
  id?: string;
  status?: string;
  tracking_number?: string;
  trackingNumber?: string;
  tracking_id?: string;
  selected_offer?: {
    id?: string | null;
  };
}

interface InPostConfig {
  token: string;
  serviceLocker: string;
  serviceCourier: string;
  parcelTemplate: string;
  parcelDimensions: {
    length: string;
    width: string;
    height: string;
    unit: "mm";
  };
  parcelWeight: {
    amount: string;
    unit: "kg";
  };
  sender: {
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    buildingNumber: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

function resolveEnv(name: string, fallback = ""): string {
  return (process.env[name] || fallback).trim();
}

function requireEnv(name: string): string {
  const value = resolveEnv(name);
  if (!value) {
    throw new Error(`[CONFIG ERROR] Missing ${name} environment variable`);
  }
  if (/<[^>]+>/.test(value)) {
    throw new Error(`[CONFIG ERROR] Invalid ${name} placeholder value`);
  }
  return value;
}

function getConfig(): InPostConfig | null {
  const token = resolveEnv("INPOST_API_SHIPX");
  if (!token) return null;

  const organizationId = resolveEnv("INPOST_SHIPX_ORG_ID");
  if (!organizationId) return null;

  return {
    token,
    serviceLocker: resolveEnv("INPOST_SERVICE_LOCKER", "inpost_locker_standard"),
    serviceCourier: resolveEnv("INPOST_SERVICE_COURIER", "inpost_courier_standard"),
    parcelTemplate: resolveEnv("INPOST_PARCEL_TEMPLATE", "small"),
    parcelDimensions: {
      length: resolveEnv("INPOST_PARCEL_LENGTH_MM", "80"),
      width: resolveEnv("INPOST_PARCEL_WIDTH_MM", "360"),
      height: resolveEnv("INPOST_PARCEL_HEIGHT_MM", "640"),
      unit: "mm",
    },
    parcelWeight: {
      amount: resolveEnv("INPOST_PARCEL_WEIGHT_KG", "2"),
      unit: "kg",
    },
    sender: {
      companyName: requireEnv("INVOICE_SELLER_NAME"),
      firstName: requireEnv("INVOICE_SELLER_FIRST_NAME"),
      lastName: requireEnv("INVOICE_SELLER_LAST_NAME"),
      email: requireEnv("INVOICE_SELLER_EMAIL"),
      phone: requireEnv("INVOICE_SELLER_PHONE"),
      street: requireEnv("INVOICE_SELLER_STREET"),
      buildingNumber: requireEnv("INVOICE_SELLER_BUILDING"),
      city: requireEnv("INVOICE_SELLER_CITY"),
      postalCode: requireEnv("INVOICE_SELLER_POST_CODE"),
      country: "PL",
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

function splitAddress(input: string | null | undefined): { street: string; buildingNumber: string } {
  let trimmed = (input || "").trim();
  if (!trimmed) {
    return { street: "", buildingNumber: "1" };
  }

  if (trimmed.includes(",")) {
    trimmed = trimmed.split(",")[0].trim();
  }

  const postalMatch = trimmed.match(/\b\d{2}-\d{3}\b/);
  if (postalMatch?.index !== undefined) {
    trimmed = trimmed.slice(0, postalMatch.index).trim();
  }

  const match = trimmed.match(/^(.*?)(\s+\d+[\w/-]*)$/);
  if (match) {
    return { street: match[1].trim(), buildingNumber: match[2].trim() };
  }

  return { street: trimmed, buildingNumber: "1" };
}

function assertValidPayload(payload: Record<string, unknown>) {
  const serialized = JSON.stringify(payload);
  if (/<[^>]+>/.test(serialized)) {
    throw new Error("[ShipX] Invalid shipment payload: placeholder values detected");
  }
  if (/":\s*"\s*"/.test(serialized)) {
    throw new Error("[ShipX] Invalid shipment payload: empty values detected");
  }
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
  private organizationId: string;

  constructor() {
    const config = getConfig();
    if (!config) {
      throw new Error("INPOST_API_SHIPX or INPOST_SHIPX_ORG_ID is not configured");
    }
    this.config = config;
    this.organizationId = resolveEnv("INPOST_SHIPX_ORG_ID");
  }

  async createShipment({ order }: ShipmentInput): Promise<ShipmentOutput> {
    const deliveryMethod = order.deliveryMethod
      || (order.deliveryPointId ? "INPOST_PACZKOMAT" : "INPOST_KURIER");
    const isLocker = deliveryMethod === "INPOST_PACZKOMAT";

    const receiverAddress = splitAddress(order.address);
    const receiver = this.buildReceiver(order, receiverAddress);
    const sender = this.buildSender();
    const shipmentPayload = this.buildShipmentPayload(order, sender, receiver, isLocker);

    if (isLocker && !order.deliveryPointId) {
      throw new Error("Missing InPost delivery point for parcel locker shipment");
    }

    assertValidPayload(shipmentPayload as Record<string, unknown>);
    console.log(`[ShipX] Creating shipment with validated sender orderId=${order.id} service=${shipmentPayload.service}`);

    const client = getShipXClient();
    const responseJson = await client.request<ShipXShipmentResponse>(`/v1/organizations/${this.organizationId}/shipments`, {
      method: "POST",
      body: JSON.stringify(shipmentPayload),
    });

    const shipmentId = responseJson.id;
    if (!shipmentId) {
      throw new Error("InPost ShipX response missing shipment id");
    }

    const trackingNumber = normalizeTrackingNumber(responseJson);
    if (!trackingNumber) {
      throw new Error("InPost ShipX response missing tracking number");
    }

    console.log("[ShipX] Shipment created providerShipmentId=", shipmentId);

    return {
      provider: "INPOST",
      trackingNumber,
      trackingUrl: buildTrackingUrl(trackingNumber),
      status: responseJson.status || "CREATED",
      shipmentId,
      shipxStatus: responseJson.status ?? null,
      selectedOfferId: responseJson.selected_offer?.id ?? null,
    };
  }

  private buildReceiver(order: ShipmentInput["order"], address: { street: string; buildingNumber: string }) {
    return {
      first_name: order.firstName,
      last_name: order.lastName,
      email: order.email,
      phone: order.phone,
      address: {
        street: address.street,
        building_number: address.buildingNumber,
        city: order.city,
        post_code: order.postalCode,
        country_code: normalizeCountryCode(order.country),
      },
    };
  }

  private buildSender() {
    return {
      company_name: this.config.sender.companyName,
      first_name: this.config.sender.firstName,
      last_name: this.config.sender.lastName,
      email: this.config.sender.email,
      phone: this.config.sender.phone,
      address: {
        street: this.config.sender.street,
        building_number: this.config.sender.buildingNumber,
        city: this.config.sender.city,
        post_code: this.config.sender.postalCode,
        country_code: "PL",
      },
    };
  }

  private buildShipmentPayload(
    order: ShipmentInput["order"],
    sender: ReturnType<InPostProvider["buildSender"]>,
    receiver: ReturnType<InPostProvider["buildReceiver"]>,
    isLocker: boolean,
  ) {
    const additionalServices = isLocker ? [] : ["email", "sms"];
    return {
      sender,
      receiver,
      parcels: [
        {
          id: this.config.parcelTemplate,
          dimensions: this.config.parcelDimensions,
          weight: this.config.parcelWeight,
          is_non_standard: false,
        },
      ],
      service: isLocker ? this.config.serviceLocker : this.config.serviceCourier,
      additional_services: additionalServices,
      reference: `order-${order.id}`,
      comments: `Order ${order.id}`,
      custom_attributes: isLocker
        ? {
            target_point: order.deliveryPointId,
          }
        : undefined,
    };
  }

  getTrackingUrl(trackingNumber: string): string {
    return buildTrackingUrl(trackingNumber);
  }
}
