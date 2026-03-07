import {
  PaymentWebhookStatus,
  COMPLETED_STATUSES,
  PENDING_STATUSES,
  CANCELED_STATUSES,
  FAILED_STATUSES,
  type PaymentWebhookStatusType,
} from "../constants/paymentStatus";

/**
 * Parsed Webhook Payload
 */
export interface ParsedWebhookPayload {
  eventId: string | null;
  status: PaymentWebhookStatusType;
  paymentReference: string | null;
  orderId: number | null;
  provider: string;
}

/**
 * Normalizes raw status string to standard payment webhook status
 */
function normalizePaymentStatus(rawStatus: string): PaymentWebhookStatusType {
  const upperStatus = rawStatus.toUpperCase();

  if (COMPLETED_STATUSES.includes(upperStatus)) {
    return PaymentWebhookStatus.COMPLETED;
  }

  if (PENDING_STATUSES.includes(upperStatus)) {
    return PaymentWebhookStatus.PENDING;
  }

  if (CANCELED_STATUSES.includes(upperStatus)) {
    return PaymentWebhookStatus.CANCELED;
  }

  if (FAILED_STATUSES.includes(upperStatus)) {
    return PaymentWebhookStatus.FAILED;
  }

  return PaymentWebhookStatus.UNKNOWN;
}

/**
 * Parses Stripe webhook payload
 */
function parseStripePayload(payload: any): ParsedWebhookPayload | null {
  if (!payload?.type || !payload?.data?.object) {
    return null;
  }

  const object = payload.data.object;
  const stripeStatus = object?.status || "";

  let status: PaymentWebhookStatusType = PaymentWebhookStatus.UNKNOWN;
  if (payload.type === "payment_intent.succeeded" && stripeStatus === "succeeded") {
    status = PaymentWebhookStatus.COMPLETED;
  }

  const paymentReference = object?.payment_intent || object?.id || null;
  const metadataOrderId = object?.metadata?.orderId ? Number(object.metadata.orderId) : null;

  return {
    eventId: payload?.id || null,
    status,
    paymentReference,
    orderId: Number.isFinite(metadataOrderId) ? metadataOrderId : null,
    provider: "stripe",
  };
}

/**
 * Parses generic webhook payload
 */
function parseGenericPayload(payload: any): ParsedWebhookPayload {
  const eventId = payload?.eventId || payload?.event_id || payload?.id || null;

  const rawStatus = String(
    payload?.status ||
    payload?.paymentStatus ||
    payload?.orderStatus ||
    ""
  );

  const status = normalizePaymentStatus(rawStatus);

  const paymentReference =
    payload?.paymentReference ||
    payload?.paymentIntentId ||
    payload?.paymentIntent ||
    payload?.orderId ||
    payload?.extOrderId ||
    null;

  const orderIdRaw = payload?.orderId || payload?.extOrderId || null;
  const orderId = orderIdRaw ? Number(orderIdRaw) : null;

  return {
    eventId,
    status,
    paymentReference: paymentReference ? String(paymentReference) : null,
    orderId: Number.isFinite(orderId) ? orderId : null,
    provider: payload?.provider || "unknown",
  };
}

/**
 * Parses webhook payload and extracts normalized payment information
 */
export function parseWebhookPayload(payload: any): ParsedWebhookPayload {
  // Try Stripe format first
  const stripeResult = parseStripePayload(payload);
  if (stripeResult) {
    return stripeResult;
  }

  // Fall back to generic format
  return parseGenericPayload(payload);
}
