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
} as const;
