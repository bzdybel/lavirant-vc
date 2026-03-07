/**
 * Shared test data fixtures for email-related tests.
 */
import type { OrderConfirmationData, PaidInvoiceEmailParams } from "../../services/EmailService";

/** Returns a valid OrderConfirmationData object. Override fields as needed. */
export function makeOrderConfirmationData(
  overrides: Partial<OrderConfirmationData> = {}
): OrderConfirmationData {
  return {
    orderId: 123,
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    productName: "Test Product",
    quantity: 1,
    total: 100,
    address: "123 Main St",
    city: "City",
    postalCode: "12-345",
    country: "PL",
    orderDate: "2024-01-01",
    ...overrides,
  };
}

/** Returns a valid PaidInvoiceEmailParams object. Override fields as needed. */
export function makePaidInvoiceEmailParams(
  overrides: Partial<PaidInvoiceEmailParams> = {}
): PaidInvoiceEmailParams {
  return {
    order: {
      id: 123,
      email: "john@example.com",
      firstName: "John",
      lastName: "Doe",
    } as any,
    product: { name: "Test Product" } as any,
    invoiceNumber: "INV-001",
    invoicePdfPath: "/path/to/invoice.pdf",
    ...overrides,
  };
}
