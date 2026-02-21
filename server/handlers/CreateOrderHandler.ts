import type { Request, Response } from "express";
import type { EmailService } from "../services/EmailService";
import type { StripeService } from "../services/StripeService";
import type { PaymentStatusService } from "../services/PaymentStatusService";
import type { Order } from "@shared/types/order";
import { storage } from "../storage";

interface CreateOrderDependencies {
  emailService: EmailService;
  stripeService: StripeService;
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

/**
 * Validates order creation request
 */
function validateOrderRequest(body: any): { valid: boolean; error?: string } {
  if (!body.productId || !body.quantity || body.quantity <= 0) {
    return { valid: false, error: "Invalid order data" };
  }

  if (!body.firstName || !body.lastName || !body.email || !body.phone || 
      !body.address || !body.city || !body.postalCode || !body.country) {
    return { valid: false, error: "Missing customer information" };
  }

  if (body.deliveryMethod === "INPOST_PACZKOMAT" && !body.deliveryPoint?.id) {
    return { valid: false, error: "Missing InPost delivery point" };
  }

  return { valid: true };
}

/**
 * Calculates order total
 */
function calculateOrderTotal(
  product: any,
  quantity: number,
  deliveryCost: number | undefined
): { deliveryCostCents: number; total: number } {
  const deliveryCostCents = Number.isFinite(Number(deliveryCost))
    ? Math.max(0, Math.round(Number(deliveryCost)))
    : 0;

  const total = product.price * quantity + deliveryCostCents;

  return { deliveryCostCents, total };
}

/**
 * Creates order in database
 */
async function createOrderRecord(
  request: CreateOrderRequest,
  product: any,
  totals: { deliveryCostCents: number; total: number }
) {
  const resolvedPaymentReference = request.paymentReference || request.paymentIntentId || null;

  const createdOrder = await storage.createOrder({
    userId: null,
    productId: request.productId,
    quantity: request.quantity,
    total: totals.total,
    deliveryCost: totals.deliveryCostCents,
    deliveryMethod: request.deliveryMethod ?? null,
    deliveryPointId: request.deliveryPoint?.id ?? null,
    status: "CREATED",
    paymentIntentId: request.paymentIntentId || null,
    paymentReference: resolvedPaymentReference,
    paymentProvider: request.paymentProvider || (request.paymentIntentId ? "stripe" : null),
    paymentPendingAt: resolvedPaymentReference ? new Date().toISOString() : null,
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

  // Update to PAYMENT_PENDING if payment reference exists
  if (resolvedPaymentReference) {
    const updated = await storage.updateOrder(createdOrder.id, { status: "PAYMENT_PENDING" });
    return updated ?? createdOrder;
  }

  return createdOrder;
}

/**
 * Sends order confirmation email
 */
async function sendOrderConfirmationEmail(
  order: any,
  product: any,
  emailService: EmailService
): Promise<void> {
  emailService.sendOrderConfirmation({
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
  }).catch(error => {
    console.error("Failed to send order confirmation email:", error);
  });
}

/**
 * Reconciles payment with Stripe
 */
async function reconcileStripePayment(
  order: any,
  product: any,
  deps: CreateOrderDependencies
): Promise<void> {
  if (!order.paymentIntentId || deps.stripeService.isMockMode()) {
    return;
  }

  const stripe = deps.stripeService.getClient();
  if (!stripe) {
    return;
  }

  try {
    await stripe.paymentIntents.update(order.paymentIntentId, {
      metadata: { orderId: String(order.id) },
    });

    const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
    if (paymentIntent.status === "succeeded" && order.status !== "PAID") {
      const updatedOrder = await deps.paymentStatusService.applyPaymentStatusUpdate({
        order: order as Order,
        status: "COMPLETED",
        paymentReference: paymentIntent.id,
        paymentProvider: "stripe",
        product,
      });

      if (updatedOrder.status === "PAID") {
        console.log("✅ Order paid via reconciliation", {
          orderId: updatedOrder.id,
          paymentIntentId: paymentIntent.id,
        });
      }
    }
  } catch (error) {
    console.warn("⚠️ Failed to reconcile payment intent for order", {
      orderId: order.id,
      error,
    });
  }
}

/**
 * Create Order Handler Factory
 * Creates a new order with customer information
 */
export function CreateOrderHandler(deps: CreateOrderDependencies) {
  return async (req: Request, res: Response) => {
    try {
      const request = req.body as CreateOrderRequest;

      // Validate request
      const validation = validateOrderRequest(request);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      // Get product
      const product = await storage.getProduct(request.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Calculate totals
      const totals = calculateOrderTotal(product, request.quantity, request.deliveryCost);

      // Create order
      const order = await createOrderRecord(request, product, totals);

      // Send confirmation email
      await sendOrderConfirmationEmail(order, product, deps.emailService);

      // Reconcile with Stripe if payment intent exists
      await reconcileStripePayment(order, product, deps);

      return res.status(201).json(order);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  };
}
