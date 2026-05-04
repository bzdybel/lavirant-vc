import { apiRequest } from "@/lib/queryClient";

interface CheckoutItem {
  productId: number;
  quantity: number;
}

interface SyncCheckoutPaymentIntentParams {
  clientSecret: string;
  productId: number;
  quantity: number;
  deliveryMethod: "inpost" | "inpost-courier";
  amount: number;
  itemsTotal: number;
  shippingCost: number;
}

function getPaymentIntentIdFromClientSecret(clientSecret: string): string {
  const paymentIntentId = clientSecret.split("_secret_")[0];
  if (!paymentIntentId) {
    throw new Error("Missing payment intent id");
  }
  return paymentIntentId;
}

export async function syncCheckoutPaymentIntent(
  params: SyncCheckoutPaymentIntentParams
): Promise<void> {
  const paymentIntentId = getPaymentIntentIdFromClientSecret(params.clientSecret);

  const items: CheckoutItem[] = [
    {
      productId: params.productId,
      quantity: params.quantity,
    },
  ];

  await apiRequest("PATCH", "/api/update-payment-intent", {
    paymentIntentId,
    productId: params.productId,
    quantity: params.quantity,
    deliveryMethod: params.deliveryMethod,
    items,
    amount: params.amount,
    itemsTotal: params.itemsTotal,
    shippingCost: params.shippingCost,
  });
}
