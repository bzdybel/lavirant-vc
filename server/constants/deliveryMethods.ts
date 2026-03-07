/**
 * Delivery Method Constants
 *
 * Defines supported delivery methods for orders.
 */
export const DeliveryMethod = {
  INPOST_PACZKOMAT: 'INPOST_PACZKOMAT',
  INPOST_KURIER: 'INPOST_KURIER',
} as const;

export type DeliveryMethodType = typeof DeliveryMethod[keyof typeof DeliveryMethod];
