/**
 * Log Prefix Constants
 *
 * Standardized prefixes for structured logging throughout the application.
 */
export const LogPrefix = {
  CONFIG_ERROR: '[CONFIG ERROR]',
  DATABASE: '[DB]',
  SHIPX: '[ShipX]',
  SHIPX_POLLING: '[ShipX Polling]',
  ORDER_PAID: '[OrderPaid]',
  EMAIL: '[Email]',
  WEBHOOK: '[Webhook]',
  PAYMENT: '[Payment]',
  STRIPE: '💳',
  INVOICE: '[Invoice]',
} as const;
