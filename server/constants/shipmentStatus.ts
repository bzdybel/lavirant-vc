/**
 * Shipment Status Constants
 *
 * Defines all possible shipment statuses in the system.
 */
export const ShipmentStatus = {
  CREATED: 'CREATED',
  SHIPPED: 'SHIPPED',
  OFFER_SELECTED: 'offer_selected',
  BUY_PENDING: 'buy_pending',
  CONFIRMED: 'confirmed',
  DELIVERED: 'delivered',
  RETURNED: 'returned',
} as const;

export type ShipmentStatusType = typeof ShipmentStatus[keyof typeof ShipmentStatus];

/**
 * Terminal shipment statuses - no further polling needed
 */
export const TERMINAL_SHIPMENT_STATUSES: string[] = ['delivered', 'returned'];
