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

interface PaymentAmounts {
  itemsAmount: number;
  shippingAmount: number;
  finalAmount: number;
}

interface PaymentIntentResult {
  clientSecret: string | null;
  paymentIntentId: string;
}

function calculateAmounts(request: PaymentIntentRequest): PaymentAmounts {
  const itemsAmount = Number.isFinite(request.itemsTotal) ? request.itemsTotal! : 0;
  const shippingAmount = Number.isFinite(request.shippingCost) ? request.shippingCost! : 0;
  const finalAmount = itemsAmount + shippingAmount || request.amount;

  return { itemsAmount, shippingAmount, finalAmount };
}

function createPaymentMetadata(amounts: PaymentAmounts, orderId?: number) {
  return {
    ...(orderId ? { orderId: String(orderId) } : {}),
    itemsTotal: String(amounts.itemsAmount),
    shippingCost: String(amounts.shippingAmount),
    finalAmount: String(amounts.finalAmount),
  };
}

async function findExistingIntent(orderId: number, stripeService: StripeService): Promise<PaymentIntentResult | null> {
  const order = await storage.getOrder(orderId);

  if (!order?.paymentIntentId) {
    return null;
  }

  const stripe = stripeService.getClient();
  if (!stripe) {
    return null;
  }

  const intent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
  };
}

async function markOrderPaymentPending(orderId: number | undefined, paymentIntentId: string): Promise<void> {
  if (!orderId) return;

  await storage.updateOrder(orderId, {
    status: "PAYMENT_PENDING",
    paymentPendingAt: new Date().toISOString(),
    paymentProvider: "stripe",
    paymentIntentId,
    paymentReference: paymentIntentId,
  });
}

async function createMockIntent(amounts: PaymentAmounts, orderId?: number): Promise<PaymentIntentResult> {
  const mockId = `mock_pi_${Date.now()}`;
  const mockSecret = `${mockId}_secret_${Math.random().toString(36).substring(7)}`;

  await markOrderPaymentPending(orderId, mockId);

  return { clientSecret: mockSecret, paymentIntentId: mockId };
}

async function createRealIntent(
  stripeService: StripeService,
  amounts: PaymentAmounts,
  orderId?: number
): Promise<PaymentIntentResult> {
  const stripe = stripeService.getClient()!;
  const amountInCents = Math.round(amounts.finalAmount * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "pln",
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'always',
    },
    metadata: createPaymentMetadata(amounts, orderId),
    description: orderId ? `Order #${orderId}` : undefined,
  });

  await markOrderPaymentPending(orderId, paymentIntent.id);

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

export function CreatePaymentIntentHandler(deps: PaymentIntentDependencies) {
  return async (req: Request, res: Response) => {
    try {
      const { amount, orderId, itemsTotal, shippingCost } = req.body as PaymentIntentRequest;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      if (orderId) {
        const existing = await findExistingIntent(orderId, deps.stripeService);
        if (existing) {
          return res.json(existing);
        }
      }

      const amounts = calculateAmounts({ amount, orderId, itemsTotal, shippingCost });

      const createIntent = deps.stripeService.isMockMode()
        ? createMockIntent
        : (amounts: PaymentAmounts, orderId?: number) => createRealIntent(deps.stripeService, amounts, orderId);

      const result = await createIntent(amounts, orderId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  };
}
