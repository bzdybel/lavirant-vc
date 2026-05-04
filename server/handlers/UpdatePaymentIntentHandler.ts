import type { Request, Response } from "express";
import type { IStripeService } from "../services/StripeService";
import { storage } from "../storage";

interface UpdatePaymentIntentDependencies {
  stripeService: IStripeService;
}

interface UpdatePaymentIntentRequest {
  paymentIntentId: string;
  productId: number;
  quantity: number;
  deliveryMethod?: string;
  amount?: number;
  itemsTotal?: number;
  shippingCost?: number;
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

export function UpdatePaymentIntentHandler(deps: UpdatePaymentIntentDependencies) {
  return async (req: Request, res: Response) => {
    const { paymentIntentId, productId, quantity, deliveryMethod } =
      req.body as UpdatePaymentIntentRequest;

    if (!paymentIntentId) {
      return res.status(400).json({ message: "Missing paymentIntentId" });
    }

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: "Invalid productId" });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const product = await storage.getProduct(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (quantity > product.availableQuantity) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    let deliverySurcharge: number;
    try {
      deliverySurcharge = resolveDeliverySurcharge(deliveryMethod);
    } catch {
      return res.status(400).json({ message: "Invalid deliveryMethod" });
    }

    const trustedItemsTotal = (product.price * quantity) / 100;
    const trustedShippingCost = BASE_SHIPPING_COST + deliverySurcharge;
    const trustedAmount = trustedItemsTotal + trustedShippingCost;

    const metadata: Record<string, string> = {};
    metadata.productId = String(productId);
    metadata.quantity = String(quantity);
    metadata.deliveryMethod = deliveryMethod || "inpost";
    metadata.itemsTotal = String(Math.round(trustedItemsTotal * 100) / 100);
    metadata.shippingCost = String(Math.round(trustedShippingCost * 100) / 100);
    metadata.finalAmount = String(Math.round(trustedAmount * 100) / 100);
    metadata.trustedPricing = "true";

    await deps.stripeService.updatePaymentIntentAmount(paymentIntentId, trustedAmount, metadata);

    return res.json({
      success: true,
      amount: Math.round(trustedAmount * 100) / 100,
      itemsTotal: Math.round(trustedItemsTotal * 100) / 100,
      shippingCost: Math.round(trustedShippingCost * 100) / 100,
    });
  };
}
