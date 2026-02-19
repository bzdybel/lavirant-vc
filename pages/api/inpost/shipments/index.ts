type NextApiRequest = {
  method?: string;
  body?: unknown;
};

type NextApiResponse<T> = {
  status: (code: number) => NextApiResponse<T>;
  json: (body: T) => NextApiResponse<T>;
  setHeader: (name: string, value: string) => void;
};

import { getShipXClient, ShipXError } from "../../../../lib/inpost/shipxClient";
import type {
  CreateShipmentInput,
  CreateShipmentResult,
  ParcelSize,
} from "../../../../lib/inpost/types";

interface ShipXShipmentResponse {
  id: string;
  status: string;
  tracking_number?: string;
}

const isParcelSize = (value: unknown): value is ParcelSize =>
  value === "small" || value === "medium" || value === "large";

const validateBody = (body: unknown): CreateShipmentInput | null => {
  if (!body || typeof body !== "object") {
    return null;
  }

  const { targetPoint, email, phone, parcelSize } = body as Record<string, unknown>;

  if (
    typeof targetPoint !== "string" ||
    typeof email !== "string" ||
    typeof phone !== "string" ||
    !isParcelSize(parcelSize)
  ) {
    return null;
  }

  return { targetPoint, email, phone, parcelSize };
};

const mapShipXError = (error: unknown) => {
  if (error instanceof ShipXError) {
    const status = error.status;
    const message =
      status === 401 || status === 403
        ? "Unauthorized"
        : status === 404
          ? "Shipment not found"
          : status === 422
            ? "Validation failed"
            : status >= 500
              ? "ShipX service error"
              : error.message;

    return { status, message };
  }

  return { status: 500, message: "Unexpected server error" };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateShipmentResult | { error: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const input = validateBody(req.body);
  if (!input) {
    return res.status(400).json({ error: "Invalid request payload" });
  }

  try {
    const client = getShipXClient();
    const payload = {
      service: "inpost_locker_standard",
      parcels: [{ template: input.parcelSize }],
      receiver: {
        email: input.email,
        phone: input.phone,
      },
      custom_attributes: {
        target_point: input.targetPoint,
        sending_method: "parcel_locker",
      },
    };

    const shipment = await client.request<ShipXShipmentResponse>("/v1/shipments", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return res.status(201).json({
      shipmentId: shipment.id,
      trackingNumber: shipment.tracking_number,
      status: shipment.status,
    });
  } catch (error) {
    const mapped = mapShipXError(error);
    return res.status(mapped.status).json({ error: mapped.message });
  }
}
