import type { Request, Response } from "express";
import type { IStripeService } from "../services/StripeService";

interface UpdatePaymentIntentDependencies {
  stripeService: IStripeService;
}

interface UpdatePaymentIntentRequest {
  paymentIntentId: string;
  amount: number;
  itemsTotal?: number;
  shippingCost?: number;
}

export function UpdatePaymentIntentHandler(deps: UpdatePaymentIntentDependencies) {
  return async (req: Request, res: Response) => {
    const { paymentIntentId, amount, itemsTotal, shippingCost } = req.body as UpdatePaymentIntentRequest;

    if (!paymentIntentId) {
      return res.status(400).json({ message: "Missing paymentIntentId" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const metadata: Record<string, string> = {};
    if (Number.isFinite(itemsTotal)) metadata.itemsTotal = String(itemsTotal);
    if (Number.isFinite(shippingCost)) metadata.shippingCost = String(shippingCost);
    metadata.finalAmount = String(Math.round(amount * 100) / 100);

    await deps.stripeService.updatePaymentIntentAmount(paymentIntentId, amount, metadata);

    return res.json({ success: true });
  };
}
