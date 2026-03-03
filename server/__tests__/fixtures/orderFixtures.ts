/**
 * Shared test data fixtures for order-related tests.
 *
 * Using factory functions (not plain objects) ensures each test receives
 * an isolated copy that can be mutated without cross-test contamination.
 */

// ---------------------------------------------------------------------------
// Customer / order creation request body
// ---------------------------------------------------------------------------

export interface OrderRequestBody {
  productId: number;
  quantity: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  [key: string]: unknown;
}

/** Returns a valid order request body. Override individual fields as needed. */
export function makeOrderBody(overrides: Partial<OrderRequestBody> = {}): OrderRequestBody {
  return {
    productId: 1,
    quantity: 2,
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "123456789",
    address: "Main 1",
    city: "Warsaw",
    postalCode: "00-001",
    country: "PL",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Product fixture
// ---------------------------------------------------------------------------

export interface ProductFixture {
  id: number;
  name: string;
  price: number;
  [key: string]: unknown;
}

export function makeProduct(overrides: Partial<ProductFixture> = {}): ProductFixture {
  return { id: 1, name: "Game", price: 100, ...overrides };
}

// ---------------------------------------------------------------------------
// Order fixture (as returned from storage)
// ---------------------------------------------------------------------------

export interface OrderFixture {
  id: number;
  status: string;
  total: number;
  productId: number;
  quantity: number;
  deliveryCost: number;
  paymentIntentId?: string | null;
  [key: string]: unknown;
}

export function makeOrder(overrides: Partial<OrderFixture> = {}): OrderFixture {
  return {
    id: 1,
    status: "PAYMENT_PENDING",
    total: 100,
    productId: 1,
    quantity: 1,
    deliveryCost: 0,
    ...overrides,
  };
}
