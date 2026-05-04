import type { Request, Response } from "express";
import type { IStripeService } from "../services/StripeService";
import { storage } from "../storage";

interface PaymentIntentDependencies {
  stripeService: IStripeService;
}

interface PaymentIntentRequest {
  amount: number;
  orderId?: number;
  productId?: number;
  quantity?: number;
  deliveryMethod?: string;
  itemsTotal?: number;
  shippingCost?: number;
}

interface PaymentIntentResult {
  clientSecret: string | null;
  paymentIntentId: string;
}

const BASE_SHIPPING_COST = 15;
const DELIVERY_SURCHARGE_BY_METHOD: Record<string, number> = {
  inpost: 0,
  "inpost-courier": 7,
  INPOST_PACZKOMAT: 0,
  INPOST_KURIER: 7,
};

function resolveDeliverySurcharge(deliveryMethod: string | undefined): number {
  if (!deliveryMethod) {
    return DELIVERY_SURCHARGE_BY_METHOD.inpost;
  }

  if (!(deliveryMethod in DELIVERY_SURCHARGE_BY_METHOD)) {
    throw new Error("Invalid deliveryMethod");
  }

  return DELIVERY_SURCHARGE_BY_METHOD[deliveryMethod];
}

async function findExistingIntent(
  orderId: number,
  stripeService: IStripeService
): Promise<PaymentIntentResult | null> {
  const order = await storage.getOrder(orderId);
  if (!order?.paymentIntentId) {
    return null;
  }

  try {
    const intent = await stripeService.retrievePaymentIntent(order.paymentIntentId);
    return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
  } catch {
    return null;
  }
}

async function markOrderPaymentPending(
  orderId: number | undefined,
  paymentIntentId: string
): Promise<void> {
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
    const { amount, orderId, productId, quantity, deliveryMethod, itemsTotal, shippingCost } =
      req.body as PaymentIntentRequest;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    let trustedItemsTotal = itemsTotal;
    let trustedShippingCost = shippingCost;

    if (Number.isInteger(productId) && Number.isInteger(quantity) && quantity! > 0) {
      const product = await storage.getProduct(productId!);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (quantity! > product.availableQuantity) {
        return res.status(400).json({ message: "Insufficient stock" });
      }

      let deliverySurcharge: number;
      try {
        deliverySurcharge = resolveDeliverySurcharge(deliveryMethod);
      } catch {
        return res.status(400).json({ message: "Invalid deliveryMethod" });
      }

      trustedItemsTotal = (product.price * quantity!) / 100;
      trustedShippingCost = BASE_SHIPPING_COST + deliverySurcharge;
    }

    if (orderId) {
      const existing = await findExistingIntent(orderId, deps.stripeService);
      if (existing) {
        return res.json(existing);
      }
    }

    const result = await deps.stripeService.createPaymentIntent({
      amount,
      orderId,
      itemsTotal: trustedItemsTotal,
      shippingCost: trustedShippingCost,
    });
    await markOrderPaymentPending(orderId, result.paymentIntentId);

    return res.json(result);
  };
}
