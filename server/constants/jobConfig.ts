/**
 * Job Configuration Constants
 *
 * Default values for background job intervals and thresholds.
 */
export const JobConfig = {
  PAYMENT_STATUS_JOB_INTERVAL_MINUTES: 45,
  PAYMENT_PENDING_THRESHOLD_MINUTES: 120,
  SHIPX_POLL_INTERVAL_MINUTES: 10,
  SHIPX_RETRY_ATTEMPTS: 3,
  SHIPX_RETRY_BASE_DELAY_MS: 500,
  SHIPX_CONSECUTIVE_FAILURE_ALERT_THRESHOLD: 3,
  SHIPX_INITIAL_TRIGGER_RETRY_DELAY_MS: 30_000,
  /** After this many consecutive per-order poll failures the order is marked polling_failed and excluded from future polls. */
  SHIPX_ORDER_MAX_POLL_FAILURES: 5,
} as const;
