import type { Request, Response } from "express";
import type { StripeService } from "../services/StripeService";
import { storage } from "../storage";

interface PaymentIntentDependencies {
  stripeService: StripeService;
}

interface PaymentIntentRequest {
  amount: number;
  orderId?: number;
  itemsTotal?: number;
  shippingCost?: number;
}

/**
 * Validates payment intent request
 */
function validateRequest(body: any): { valid: boolean; error?: string } {
  if (!body.amount || body.amount <= 0) {
    return { valid: false, error: "Invalid amount" };
  }
  return { valid: true };
}

/**
 * Calculates final payment amount
 */
function calculateAmount(request: PaymentIntentRequest): {
  itemsAmount: number;
  shippingAmount: number;
  finalAmount: number;
} {
  const itemsAmount = Number.isFinite(request.itemsTotal) ? request.itemsTotal! : 0;
  const shippingAmount = Number.isFinite(request.shippingCost) ? request.shippingCost! : 0;
  const finalAmount = itemsAmount + shippingAmount || request.amount;

  return { itemsAmount, shippingAmount, finalAmount };
}

/**
 * Retrieves existing payment intent for an order
 */
async function getExistingPaymentIntent(orderId: number, stripeService: StripeService) {
  const order = await storage.getOrder(orderId);
  if (!order) {
    return { error: "Order not found", order: null, intent: null };
  }

  if (order.paymentIntentId) {
    const stripe = stripeService.getClient();
    if (!stripe) {
      return { error: "Stripe is not configured", order, intent: null };
    }
    const intent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
    return { order, intent, error: null };
  }

  return { order, intent: null, error: null };
}

/**
 * Creates mock payment intent for development
 */
async function createMockPaymentIntent(
  amounts: { itemsAmount: number; shippingAmount: number; finalAmount: number },
  orderId?: number
) {
  const mockId = `mock_pi_${Date.now()}`;
  const mockClientSecret = `${mockId}_secret_${Math.random().toString(36).substring(7)}`;
  
  console.log("🧪 Mock payment intent created", {
    mockId,
    amount: amounts.finalAmount,
    itemsTotal: amounts.itemsAmount,
    shippingCost: amounts.shippingAmount,
  });

  if (orderId) {
    await storage.updateOrder(orderId, {
      status: "PAYMENT_PENDING",
      paymentPendingAt: new Date().toISOString(),
      paymentProvider: "stripe",
      paymentIntentId: mockId,
      paymentReference: mockId,
    });
  }

  return { clientSecret: mockClientSecret, paymentIntentId: mockId };
}

/**
 * Creates real Stripe payment intent
 */
async function createStripePaymentIntent(
  stripeService: StripeService,
  amounts: { itemsAmount: number; shippingAmount: number; finalAmount: number },
  orderId?: number
) {
  const stripe = stripeService.getClient()!;
  const amountInCents = Math.round(amounts.finalAmount * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "pln",
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'always',
    },
    metadata: {
      ...(orderId ? { orderId: String(orderId) } : {}),
      itemsTotal: String(amounts.itemsAmount),
      shippingCost: String(amounts.shippingAmount),
      finalAmount: String(amounts.finalAmount),
    },
    description: orderId ? `Order #${orderId}` : undefined,
  });

  console.log("✅ Stripe payment intent created (LIVE)", {
    paymentIntentId: paymentIntent.id,
    amountInCents,
    amountInPLN: amounts.finalAmount,
    itemsTotal: amounts.itemsAmount,
    shippingCost: amounts.shippingAmount,
    metadata: paymentIntent.metadata,
  });

  if (orderId) {
    await storage.updateOrder(orderId, {
      status: "PAYMENT_PENDING",
      paymentPendingAt: new Date().toISOString(),
      paymentProvider: "stripe",
      paymentReference: paymentIntent.id,
      paymentIntentId: paymentIntent.id,
    });
  }

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

/**
 * Create Payment Intent Handler Factory
 * Creates or retrieves a Stripe payment intent for an order
 */
export function CreatePaymentIntentHandler(deps: PaymentIntentDependencies) {
  return async (req: Request, res: Response) => {
    try {
      const { amount, orderId, itemsTotal, shippingCost } = req.body as PaymentIntentRequest;

      // Validate request
      const validation = validateRequest(req.body);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      // Calculate amounts
      const amounts = calculateAmount({ amount, orderId, itemsTotal, shippingCost });

      console.log("💳 Payment Intent Creation", {
        itemsTotal: amounts.itemsAmount,
        shippingCost: amounts.shippingAmount,
        finalAmount: amounts.finalAmount,
        amountFromFrontend: amount,
        orderId,
        stripeMode: deps.stripeService.isAvailable() ? "live" : "mock",
      });

      // Check for existing payment intent
      if (orderId) {
        const existing = await getExistingPaymentIntent(orderId, deps.stripeService);
        if (existing.error) {
          return res.status(existing.order ? 500 : 404).json({ message: existing.error });
        }
        if (existing.intent) {
          console.log("📌 Retrieving existing payment intent", {
            paymentIntentId: existing.intent.id,
            existingAmount: existing.intent.amount,
          });
          return res.json({
            clientSecret: existing.intent.client_secret,
            paymentIntentId: existing.intent.id,
          });
        }
      }

      // Create payment intent (mock or real)
      if (deps.stripeService.isMockMode()) {
        const result = await createMockPaymentIntent(amounts, orderId);
        return res.json(result);
      } else {
        const result = await createStripePaymentIntent(deps.stripeService, amounts, orderId);
        return res.json(result);
      }
    } catch (error: any) {
      console.error("❌ Error creating payment intent", {
        error: error.message,
        code: error.code,
      });
      return res.status(500).json({ message: `Error creating payment intent: ${error.message}` });
    }
  };
}
