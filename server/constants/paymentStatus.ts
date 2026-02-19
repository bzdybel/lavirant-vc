/**
 * Payment Status Constants
 *
 * Defines all possible payment statuses for webhook processing and order states.
 */
export const PaymentWebhookStatus = {
  COMPLETED: 'COMPLETED',
  PENDING: 'PENDING',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type PaymentWebhookStatusType = typeof PaymentWebhookStatus[keyof typeof PaymentWebhookStatus];

export const StripePaymentIntentStatus = {
  SUCCEEDED: 'succeeded',
  CANCELED: 'canceled',
  REQUIRES_PAYMENT_METHOD: 'requires_payment_method',
  PROCESSING: 'processing',
} as const;

export type StripePaymentIntentStatusType = typeof StripePaymentIntentStatus[keyof typeof StripePaymentIntentStatus];

/**
 * Maps raw webhook status strings to normalized payment status
 */
export const COMPLETED_STATUSES = ['COMPLETED', 'SUCCESS', 'PAID', 'SUCCEEDED'];
export const PENDING_STATUSES = ['PENDING', 'PROCESSING'];
export const CANCELED_STATUSES = ['CANCELED', 'CANCELLED'];
export const FAILED_STATUSES = ['FAILED', 'ERROR'];
