export type InpostEnvironment = "production" | "sandbox";

export type ParcelSize = "small" | "medium" | "large";

export interface CreateShipmentInput {
  targetPoint: string;
  email: string;
  phone: string;
  parcelSize: ParcelSize;
}

export interface CreateShipmentResult {
  shipmentId: string;
  trackingNumber?: string;
  status: string;
}

export type LabelFormat = "pdf" | "zpl";

export interface LabelRequestBody {
  format: LabelFormat;
  download?: boolean;
}

export interface LabelResult {
  base64: string;
  format: LabelFormat;
}

export interface ShipXErrorPayload {
  error?: {
    message?: string;
    code?: string | number;
  };
  message?: string;
  errors?: Array<{ field?: string; message?: string } | string>;
}

export interface ShipXShipmentDetails {
  id: string;
  status?: string | null;
  tracking_number?: string | null;
  trackingNumber?: string | null;
}
