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
    isAvailable: jest.fn().mockReturnValue(true),
    createPaymentIntent: jest.fn().mockResolvedValue({
      clientSecret: 'mock_secret',
      paymentIntentId: 'mock_pi_123',
    }),
    retrievePaymentIntent: jest.fn().mockResolvedValue({
      id: 'mock_pi_123',
      client_secret: 'mock_secret',
    }),
    updatePaymentIntentMetadata: jest.fn().mockResolvedValue({}),
    constructWebhookEvent: jest.fn().mockReturnValue(null),
    getWebhookSecret: jest.fn().mockReturnValue(''),
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
