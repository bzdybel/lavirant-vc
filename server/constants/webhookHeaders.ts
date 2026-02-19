/**
 * Webhook Header Constants
 *
 * HTTP header names used for webhook signature verification.
 */
export const WebhookHeaders = {
  STRIPE_SIGNATURE: 'stripe-signature',
  X_WEBHOOK_SIGNATURE: 'x-webhook-signature',
  X_SIGNATURE: 'x-signature',
} as const;
