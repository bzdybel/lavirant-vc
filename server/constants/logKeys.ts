/**
 * Canonical Log Metadata Keys
 *
 * Enforces consistent naming of metadata keys across all structured logs.
 * Each key represents a single logical value — use these constants instead of
 * hardcoded strings to prevent naming drift.
 *
 * Naming conventions:
 * - `orderId`              → internal DB order ID
 * - `shipmentId`           → internal DB shipment record ID
 * - `providerShipmentId`   → external shipment ID from shipping provider (e.g. InPost ShipX)
 * - `paymentIntentId`      → Stripe payment intent ID (or mock equivalent)
 * - `invoiceNumber`        → human-readable invoice number (e.g. FV/2026/04/0001)
 * - `trackingNumber`       → shipment tracking number
 */
export const LogKey = {
  // ── Entity IDs ──────────────────────────────────────────────
  /** Internal database order ID */
  ORDER_ID: "orderId",
  /** Internal database shipment record ID */
  SHIPMENT_ID: "shipmentId",
  /** External shipment ID from shipping provider (InPost ShipX) */
  PROVIDER_SHIPMENT_ID: "providerShipmentId",
  /** Stripe (or mock) payment intent ID */
  PAYMENT_INTENT_ID: "paymentIntentId",
  /** Human-readable invoice number */
  INVOICE_NUMBER: "invoiceNumber",
  /** Shipment tracking number */
  TRACKING_NUMBER: "trackingNumber",

  // ── HTTP / Request ──────────────────────────────────────────
  METHOD: "method",
  PATH: "path",
  STATUS_CODE: "statusCode",
  DURATION_MS: "durationMs",

  // ── Payment ─────────────────────────────────────────────────
  AMOUNT_IN_CENTS: "amountInCents",
  AMOUNT_IN_PLN: "amountInPLN",
  ITEMS_TOTAL: "itemsTotal",
  SHIPPING_COST: "shippingCost",
  FINAL_AMOUNT: "finalAmount",
  AMOUNT_FROM_FRONTEND: "amountFromFrontend",
  STRIPE_STATUS: "stripeStatus",
  MAPPED_STATUS: "mappedStatus",
  DRY_RUN: "dryRun",
  STATUS: "status",

  // ── Email ───────────────────────────────────────────────────
  TO: "to",
  MESSAGE_ID: "messageId",

  // ── Shipping ────────────────────────────────────────────────
  OFFER_ID: "offerId",
  SERVICE: "service",
  ENVIRONMENT: "environment",
  FAILURES: "failures",
  MAX_FAILURES: "maxFailures",
  ATTEMPT: "attempt",
  MAX_ATTEMPTS: "maxAttempts",

  // ── Job ─────────────────────────────────────────────────────
  STARTED_AT: "startedAt",
  PENDING_ORDERS: "pendingOrders",
  PENDING_THRESHOLD_MINUTES: "pendingThresholdMinutes",
  CONSECUTIVE_FAILURES: "consecutiveFailures",
  PAYMENT_PENDING_AT: "paymentPendingAt",
  CREATED_AT: "createdAt",
  ELIGIBLE: "eligible",

  // ── Captcha ─────────────────────────────────────────────────
  IP: "ip",

  // ── Config ──────────────────────────────────────────────────
  WARNINGS: "warnings",
  ERRORS: "errors",
} as const;

export type LogKeyType = (typeof LogKey)[keyof typeof LogKey];
