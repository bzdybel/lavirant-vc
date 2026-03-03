/**
 * Factory helpers for common service mocks used across handler tests.
 *
 * Each factory returns a fresh object with Jest mock functions so tests
 * remain fully isolated even when helpers are shared.
 */

export function makeEmailServiceMock() {
  return {
    sendOrderConfirmation: jest.fn().mockResolvedValue(true),
    sendPaymentConfirmation: jest.fn().mockResolvedValue(true),
    sendShipmentEmail: jest.fn().mockResolvedValue(true),
    sendPaidInvoiceEmail: jest.fn().mockResolvedValue(true),
  };
}

export function makeStripeServiceMock() {
  return {
    isMockMode: jest.fn().mockReturnValue(true),
    isAvailable: jest.fn().mockReturnValue(true),
    getClient: jest.fn().mockReturnValue(null),
  };
}

export function makePaymentStatusServiceMock() {
  return {
    applyPaymentStatusUpdate: jest.fn().mockResolvedValue({}),
  };
}

export function makeShippingServiceMock() {
  return {
    markShipped: jest.fn().mockResolvedValue(null),
    onOrderPaid: jest.fn().mockResolvedValue({}),
  };
}

/** Builds a minimal Stripe client mock with the given payment-intent responses. */
export function makeStripeClientMock(overrides: Record<string, unknown> = {}) {
  return {
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
    ...overrides,
  };
}
