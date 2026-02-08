import type { Order } from "@shared/types/order";
import type { Product } from "@shared/types/product";
import { storage, type OrderStatus } from "./storage";
import { generateInvoiceForOrder } from "./invoiceService";
import { emailService } from "./emailService";
import { shippingService } from "./shipping/ShippingService";

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
  if (updated) {
    console.log("[DB] Payment updated", { orderId: updated.id, status });
  }
  return updated ?? order;
}

async function onOrderPaid(order: Order, product?: Product) {
  await shippingService.onOrderPaid(order);

  const invoiceResult = await generateInvoiceForOrder(order, product);
  const invoicedOrder = (await storage.updateOrder(order.id, {
    invoiceNumber: invoiceResult.invoiceNumber,
    invoicePdfPath: invoiceResult.invoicePdfPath,
    invoiceIssuedAt: invoiceResult.invoiceIssuedAt,
  })) ?? order;

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

      return onOrderPaid(paidOrder, product);
    }
    default:
      return order;
  }
}
