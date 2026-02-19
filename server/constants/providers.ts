/**
 * Provider Constants
 *
 * Defines supported third-party service providers.
 */
export const PaymentProvider = {
  STRIPE: 'stripe',
  UNKNOWN: 'unknown',
} as const;

export type PaymentProviderType = typeof PaymentProvider[keyof typeof PaymentProvider];

export const ShippingProvider = {
  INPOST: 'INPOST',
} as const;

export type ShippingProviderType = typeof ShippingProvider[keyof typeof ShippingProvider];
