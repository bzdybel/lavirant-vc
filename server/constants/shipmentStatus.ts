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
  /**
   * Set by ShipXPollingJob when an order exceeds SHIPX_ORDER_MAX_POLL_FAILURES.
   * Stops further polling to avoid an infinite retry loop.
   */
  POLLING_FAILED: 'polling_failed',
} as const;

export type ShipmentStatusType = typeof ShipmentStatus[keyof typeof ShipmentStatus];

/**
 * Terminal shipment statuses - no further polling needed
 */
export const TERMINAL_SHIPMENT_STATUSES: string[] = ['delivered', 'returned', 'polling_failed'];
