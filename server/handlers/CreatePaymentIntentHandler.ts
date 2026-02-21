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

function validateRequest(body: any): { valid: boolean; error?: string } {
  if (!body.amount || body.amount <= 0) {
    return { valid: false, error: "Invalid amount" };
  }
  
  return { valid: true };
}

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

async function getExistingPaymentIntent(orderId: number, stripeService: StripeService) {
  const order = await storage.getOrder(orderId);
  
  if (!order) {
    return { error: "Order not found", order: null, intent: null };
  }

  if (!order.paymentIntentId) {
    return { order, intent: null, error: null };
  }

  const stripe = stripeService.getClient();
  
  if (!stripe) {
    return { error: "Stripe is not configured", order, intent: null };
  }

  const intent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
  return { order, intent, error: null };
}

async function updateOrderPaymentPending(
  orderId: number | undefined,
  paymentIntentId: string,
  paymentReference: string
): Promise<void> {
  if (!orderId) return;

  await storage.updateOrder(orderId, {
    status: "PAYMENT_PENDING",
    paymentPendingAt: new Date().toISOString(),
    paymentProvider: "stripe",
    paymentIntentId,
    paymentReference,
  });
}

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

  await updateOrderPaymentPending(orderId, mockId, mockId);

  return { clientSecret: mockClientSecret, paymentIntentId: mockId };
}

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

  await updateOrderPaymentPending(orderId, paymentIntent.id, paymentIntent.id);

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

export function CreatePaymentIntentHandler(deps: PaymentIntentDependencies) {
  return async (req: Request, res: Response) => {
    try {
      const { amount, orderId, itemsTotal, shippingCost } = req.body as PaymentIntentRequest;

      const validation = validateRequest(req.body);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      const amounts = calculateAmount({ amount, orderId, itemsTotal, shippingCost });

      console.log("💳 Payment Intent Creation", {
        itemsTotal: amounts.itemsAmount,
        shippingCost: amounts.shippingAmount,
        finalAmount: amounts.finalAmount,
        amountFromFrontend: amount,
        orderId,
        stripeMode: deps.stripeService.isAvailable() ? "live" : "mock",
      });

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

      const createIntent = deps.stripeService.isMockMode()
        ? () => createMockPaymentIntent(amounts, orderId)
        : () => createStripePaymentIntent(deps.stripeService, amounts, orderId);

      const result = await createIntent();
      return res.json(result);
    } catch (error: any) {
      console.error("❌ Error creating payment intent", {
        error: error.message,
        code: error.code,
      });
      return res.status(500).json({ message: `Error creating payment intent: ${error.message}` });
    }
  };
}
