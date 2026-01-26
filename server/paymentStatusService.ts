import type { Order, Product } from "@shared/schema";
import { storage, type OrderStatus } from "./storage";
import { generateInvoiceForOrder } from "./invoiceService";
import { emailService } from "./emailService";

export type PaymentWebhookStatus = "COMPLETED" | "PENDING" | "FAILED" | "CANCELED" | "UNKNOWN";

interface ApplyPaymentStatusParams {
  order: Order;
  status: PaymentWebhookStatus;
  paymentReference?: string | null;
  paymentProvider?: string | null;
  product?: Product | undefined;
}

function resolvePaymentReference(order: Order, paymentReference?: string | null) {
  return order.paymentReference || paymentReference || null;
}

function resolvePaymentProvider(order: Order, paymentProvider?: string | null) {
  return order.paymentProvider || paymentProvider || null;
}

async function ensureOrderStatus(order: Order, status: OrderStatus, update: Partial<Order>): Promise<Order> {
  if (order.status === status) return order;
  const updated = await storage.updateOrder(order.id, { ...update, status });
  return updated ?? order;
}

export async function applyPaymentStatusUpdate({
  order,
  status,
  paymentReference,
  paymentProvider,
  product,
}: ApplyPaymentStatusParams): Promise<Order> {
  const paymentReferenceValue = resolvePaymentReference(order, paymentReference);
  const paymentProviderValue = resolvePaymentProvider(order, paymentProvider);

  switch (status) {
    case "PENDING": {
      const pendingAt = order.paymentPendingAt || new Date().toISOString();
      return ensureOrderStatus(order, "PAYMENT_PENDING", {
        paymentPendingAt: pendingAt,
        paymentReference: paymentReferenceValue,
        paymentProvider: paymentProviderValue,
      });
    }
    case "FAILED":
    case "CANCELED": {
      return ensureOrderStatus(order, "FAILED", {
        paymentReference: paymentReferenceValue,
        paymentProvider: paymentProviderValue,
      });
    }
    case "COMPLETED": {
      const paymentConfirmedAt = order.paymentConfirmedAt || new Date().toISOString();
      const paidOrder = await ensureOrderStatus(order, "PAID", {
        paymentConfirmedAt,
        paymentReference: paymentReferenceValue,
        paymentProvider: paymentProviderValue,
      });

      const invoiceResult = await generateInvoiceForOrder(paidOrder, product);
      const invoicedOrder = (await storage.updateOrder(paidOrder.id, {
        invoiceNumber: invoiceResult.invoiceNumber,
        invoicePdfPath: invoiceResult.invoicePdfPath,
        invoiceIssuedAt: invoiceResult.invoiceIssuedAt,
      })) ?? paidOrder;

      if (invoicedOrder.emailSentAt) return invoicedOrder;

      const emailSent = await emailService.sendPaidInvoiceEmail({
        order: invoicedOrder,
        product,
        invoiceNumber: invoiceResult.invoiceNumber,
        invoicePdfPath: invoiceResult.invoicePdfAbsolutePath,
      });

      if (!emailSent) return invoicedOrder;

      return (await storage.updateOrder(invoicedOrder.id, {
        emailSentAt: new Date().toISOString(),
      })) ?? invoicedOrder;
    }
    default:
      return order;
  }
}
