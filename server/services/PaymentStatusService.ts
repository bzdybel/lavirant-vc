import type { Order } from "@shared/types/order";
import type { Product } from "@shared/types/product";
import { storage, type OrderStatus } from "../storage";
import { generateInvoiceForOrder } from "../invoiceService";
import { PaymentWebhookStatus, type PaymentWebhookStatusType } from "../constants/paymentStatus";
import { LogPrefix } from "../constants/logPrefixes";

// Forward declarations to avoid circular dependencies
export interface IEmailService {
  sendPaidInvoiceEmail(params: {
    order: Order;
    product?: Product;
    invoiceNumber: string;
    invoicePdfPath: string;
  }): Promise<boolean>;
}

export interface IShippingService {
  onOrderPaid(order: Order): Promise<any>;
}
/**
 * Payment Update Parameters
 */
export interface PaymentUpdateParams {
  order: Order;
  status: PaymentWebhookStatusType;
  paymentReference?: string | null;
  paymentProvider?: string | null;
  product?: Product;
}

/**
 * Payment Status Service
 *
 * Handles payment status updates and orchestrates post-payment workflows.
 * Single Responsibility: Manage payment state transitions and trigger side effects.
 */
export class PaymentStatusService {
  constructor(
    private readonly emailService: IEmailService,
    private readonly shippingService: IShippingService
  ) {}

  /**
   * Applies payment status update and orchestrates related workflows
   */
  async applyPaymentStatusUpdate(params: PaymentUpdateParams): Promise<Order> {
    const { order, status, paymentReference, paymentProvider, product } = params;

    const resolvedReference = this.resolvePaymentReference(order, paymentReference);
    const resolvedProvider = this.resolvePaymentProvider(order, paymentProvider);

    switch (status) {
      case PaymentWebhookStatus.PENDING:
        return this.handlePendingStatus(order, resolvedReference, resolvedProvider);

      case PaymentWebhookStatus.FAILED:
      case PaymentWebhookStatus.CANCELED:
        return this.handleFailedStatus(order, resolvedReference, resolvedProvider);

      case PaymentWebhookStatus.COMPLETED:
        return this.handleCompletedStatus(order, resolvedReference, resolvedProvider, product);

      default:
        return order;
    }
  }

  /**
   * Handles pending payment status
   */
  private async handlePendingStatus(
    order: Order,
    paymentReference: string | null,
    paymentProvider: string | null
  ): Promise<Order> {
    const paymentPendingAt = order.paymentPendingAt || new Date().toISOString();

    return this.updateOrderStatus(order, "PAYMENT_PENDING" as OrderStatus, {
      paymentPendingAt,
      paymentReference,
      paymentProvider,
    });
  }

  /**
   * Handles failed/canceled payment status
   */
  private async handleFailedStatus(
    order: Order,
    paymentReference: string | null,
    paymentProvider: string | null
  ): Promise<Order> {
    return this.updateOrderStatus(order, "FAILED" as OrderStatus, {
      paymentReference,
      paymentProvider,
    });
  }

  /**
   * Handles completed payment status and orchestrates post-payment workflow
   */
  private async handleCompletedStatus(
    order: Order,
    paymentReference: string | null,
    paymentProvider: string | null,
    product?: Product
  ): Promise<Order> {
    const paymentConfirmedAt = order.paymentConfirmedAt || new Date().toISOString();

    const paidOrder = await this.updateOrderStatus(order, "PAID" as OrderStatus, {
      paymentConfirmedAt,
      paymentReference,
      paymentProvider,
    });

    return this.executePostPaymentWorkflow(paidOrder, product);
  }

  /**
   * Executes post-payment workflow (shipping, invoice, email)
   */
  private async executePostPaymentWorkflow(order: Order, product?: Product): Promise<Order> {
    // Create shipment
    await this.shippingService.onOrderPaid(order);

    // Generate invoice
    const invoiceResult = await generateInvoiceForOrder(order, product);
    const invoicedOrder = (await storage.updateOrder(order.id, {
      invoiceNumber: invoiceResult.invoiceNumber,
      invoicePdfPath: invoiceResult.invoicePdfPath,
      invoiceIssuedAt: invoiceResult.invoiceIssuedAt,
    }) ?? order) as Order;

    // Send email if not already sent
    if (invoicedOrder.emailSentAt) {
      return invoicedOrder;
    }

    const emailSent = await this.emailService.sendPaidInvoiceEmail({
      order: invoicedOrder,
      product,
      invoiceNumber: invoiceResult.invoiceNumber,
      invoicePdfPath: invoiceResult.invoicePdfAbsolutePath,
    });

    if (!emailSent) {
      return invoicedOrder;
    }

    return (await storage.updateOrder(invoicedOrder.id, {
      emailSentAt: new Date().toISOString(),
    }) ?? invoicedOrder) as Order;
  }

  /**
   * Updates order status if different from current status
   */
  private async updateOrderStatus(
    order: Order,
    status: OrderStatus,
    updates: Partial<Order>
  ): Promise<Order> {
    if (order.status === status) {
      return order;
    }

    const updated = (await storage.updateOrder(order.id, { ...updates, status } as any)) as Order | undefined;

    if (updated) {
      console.log(`${LogPrefix.DATABASE} Payment updated`, {
        orderId: updated.id,
        status,
      });
    }

    return (updated ?? order) as Order;
  }

  /**
   * Resolves payment reference from order or parameter
   */
  private resolvePaymentReference(order: Order, paymentReference?: string | null): string | null {
    return order.paymentReference || paymentReference || null;
  }

  /**
   * Resolves payment provider from order or parameter
   */
  private resolvePaymentProvider(order: Order, paymentProvider?: string | null): string | null {
    return order.paymentProvider || paymentProvider || null;
  }
}
