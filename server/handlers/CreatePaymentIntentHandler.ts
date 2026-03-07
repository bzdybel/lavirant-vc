import type { Request, Response } from "express";
import type { IStripeService } from "../services/StripeService";
import { storage } from "../storage";

interface PaymentIntentDependencies {
  stripeService: IStripeService;
}

interface PaymentIntentRequest {
  amount: number;
  orderId?: number;
  itemsTotal?: number;
  shippingCost?: number;
}

interface PaymentIntentResult {
  clientSecret: string | null;
  paymentIntentId: string;
}

async function findExistingIntent(orderId: number, stripeService: IStripeService): Promise<PaymentIntentResult | null> {
  if (!stripeService.isAvailable()) {
    return null;
  }

  const order = await storage.getOrder(orderId);
  if (!order?.paymentIntentId) {
    return null;
  }

  const intent = await stripeService.retrievePaymentIntent(order.paymentIntentId);
  return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
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

export function CreatePaymentIntentHandler(deps: PaymentIntentDependencies) {
  return async (req: Request, res: Response) => {
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

    const result = await deps.stripeService.createPaymentIntent({ amount, orderId, itemsTotal, shippingCost });
    await markOrderPaymentPending(orderId, result.paymentIntentId);

    return res.json(result);
  };
}
