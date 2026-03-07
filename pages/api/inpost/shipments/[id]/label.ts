import type { NextApiRequest, NextApiResponse } from "next";
import { getShipXClient, ShipXError } from "../../../../../lib/inpost/shipxClient";
import type { LabelFormat, LabelRequestBody, LabelResult } from "../../../../../lib/inpost/types";

const isLabelFormat = (value: unknown): value is LabelFormat =>
  value === "pdf" || value === "zpl";

const validateBody = (body: unknown): LabelRequestBody | null => {
  if (!body || typeof body !== "object") {
    return null;
  }

  const { format, download } = body as Record<string, unknown>;
  if (!isLabelFormat(format)) {
    return null;
  }

  return {
    format,
    download: typeof download === "boolean" ? download : undefined,
  };
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
  res: NextApiResponse<LabelResult | { error: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const shipmentId = req.query.id;
  if (typeof shipmentId !== "string" || shipmentId.length === 0) {
    return res.status(400).json({ error: "Missing shipment id" });
  }

  const input = validateBody(req.body);
  if (!input) {
    return res.status(400).json({ error: "Invalid request payload" });
  }

  try {
    const client = getShipXClient();
    const formatParam = encodeURIComponent(input.format);
    const labelBuffer = await client.requestBinary(
      `/v1/shipments/${shipmentId}/label?format=${formatParam}`,
      { method: "GET" }
    );

    const buffer = Buffer.from(labelBuffer);
    const contentType = input.format === "pdf" ? "application/pdf" : "application/zpl";
    const filename = `label-${shipmentId}.${input.format}`;

    if (input.download) {
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      return res.status(200).send(buffer);
    }

    return res.status(200).json({
      base64: buffer.toString("base64"),
      format: input.format,
    });
  } catch (error) {
    const mapped = mapShipXError(error);
    return res.status(mapped.status).json({ error: mapped.message });
  }
}
