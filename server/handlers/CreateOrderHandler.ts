import type { Request, Response } from "express";
import type { IEmailService } from "../services/EmailService";
import type { IStripeService } from "../services/StripeService";
import type { PaymentStatusService } from "../services/PaymentStatusService";
import type { Order } from "@shared/types/order";
import { storage } from "../storage";

interface CreateOrderDependencies {
  emailService: IEmailService;
  stripeService: IStripeService;
  paymentStatusService: PaymentStatusService;
}

interface CreateOrderRequest {
  productId: number;
  quantity: number;
  paymentIntentId?: string;
  paymentReference?: string;
  paymentProvider?: string;
  deliveryCost?: number;
  deliveryMethod?: string;
  deliveryPoint?: { id: string };
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

function validateOrderFields(request: CreateOrderRequest): string | null {
  if (!request.productId || !request.quantity || request.quantity <= 0) {
    return "Invalid order data";
  }

  if (!request.firstName || !request.lastName || !request.email || !request.phone ||
      !request.address || !request.city || !request.postalCode || !request.country) {
    return "Missing customer information";
  }

  if (request.deliveryMethod === "INPOST_PACZKOMAT" && !request.deliveryPoint?.id) {
    return "Missing InPost delivery point";
  }

  return null;
}

function calculateOrderTotal(product: any, quantity: number, deliveryCost?: number): number {
  const shipping = Number.isFinite(Number(deliveryCost)) ? Math.max(0, Math.round(Number(deliveryCost))) : 0;
  return product.price * quantity + shipping;
}

function resolvePaymentReference(request: CreateOrderRequest): string | null {
  return request.paymentReference || request.paymentIntentId || null;
}

async function createOrderRecord(
  request: CreateOrderRequest,
  product: any,
  total: number
): Promise<any> {
  const paymentRef = resolvePaymentReference(request);

  return await storage.createOrder({
    productId: request.productId,
    quantity: request.quantity,
    total,
    deliveryCost: Number.isFinite(Number(request.deliveryCost)) ? Math.max(0, Math.round(Number(request.deliveryCost))) : 0,
    deliveryMethod: request.deliveryMethod ?? null,
    deliveryPointId: request.deliveryPoint?.id ?? null,
    status: paymentRef ? "PAYMENT_PENDING" : "CREATED",
    paymentIntentId: request.paymentIntentId || null,
    paymentReference: paymentRef,
    paymentProvider: request.paymentProvider || (request.paymentIntentId ? "stripe" : null),
    paymentPendingAt: paymentRef ? new Date().toISOString() : null,
    firstName: request.firstName,
    lastName: request.lastName,
    email: request.email,
    phone: request.phone,
    address: request.address,
    city: request.city,
    postalCode: request.postalCode,
    country: request.country,
    createdAt: new Date().toISOString(),
  });
}

function sendOrderConfirmationEmail(order: any, product: any, emailService: IEmailService): Promise<any> {
  return emailService.sendOrderConfirmation({
    orderId: order.id,
    firstName: order.firstName,
    lastName: order.lastName,
    email: order.email,
    productName: product.name,
    quantity: order.quantity,
    total: order.total,
    address: order.address,
    city: order.city,
    postalCode: order.postalCode,
    country: order.country,
    orderDate: order.createdAt,
  });
}

async function reconcileStripePayment(order: any, product: any, deps: CreateOrderDependencies): Promise<void> {
  if (!order.paymentIntentId || !deps.stripeService.isAvailable()) {
    return;
  }

  await deps.stripeService.updatePaymentIntentMetadata(order.paymentIntentId, {
    orderId: String(order.id),
  });

  const paymentIntent = await deps.stripeService.retrievePaymentIntent(order.paymentIntentId);

  if (paymentIntent.status === "succeeded" && order.status !== "PAID") {
    await deps.paymentStatusService.applyPaymentStatusUpdate({
      order: order as Order,
      status: "COMPLETED",
      paymentReference: paymentIntent.id,
      paymentProvider: "stripe",
      product,
    });
  }
}

export function CreateOrderHandler(deps: CreateOrderDependencies) {
  return async (req: Request, res: Response) => {
    const request = req.body as CreateOrderRequest;

    const validationError = validateOrderFields(request);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const product = await storage.getProduct(request.productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const total = calculateOrderTotal(product, request.quantity, request.deliveryCost);
    const order = await createOrderRecord(request, product, total);

    await sendOrderConfirmationEmail(order, product, deps.emailService).catch(() => {});
    await reconcileStripePayment(order, product, deps).catch(() => {});

    return res.status(201).json(order);
  };
}
