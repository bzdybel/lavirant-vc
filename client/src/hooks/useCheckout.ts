import { useQuery } from "@tanstack/react-query";
import { STRIPE_CONFIG } from "@/config/checkout.config";
import { apiRequest } from "@/lib/queryClient";

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  image: string;
  availableQuantity: number;
}

interface ProductResponse {
  id: number;
  name: string;
  description?: string;
  price: number;
  image: string;
  availableQuantity: number;
}

interface PaymentIntentResponse {
  clientSecret: string;
}

interface PaymentIntentRequest {
  amount: number;
  productId: number;
  quantity: number;
  deliveryMethod: "inpost" | "inpost-courier";
}

const fetchProduct = async (productId: string): Promise<Product> => {
  const res = await apiRequest("GET", `/api/products/${productId}`);
  const data: ProductResponse = await res.json();
  return {
    id: data.id,
    name: data.name,
    price: data.price / 100, // Convert from cents
    image: data.image,
    availableQuantity: data.availableQuantity,
  };
};

const createPaymentIntent = async ({
  amount,
  productId,
  quantity,
  deliveryMethod,
}: PaymentIntentRequest): Promise<string> => {
  const res = await apiRequest("POST", "/api/create-payment-intent", {
    amount,
    productId,
    quantity,
    deliveryMethod,
  });
  const data: PaymentIntentResponse = await res.json();
  return data.clientSecret;
};

export const useProduct = (productId: string) => {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProduct(productId),
  });
};

export const usePaymentIntent = (params: PaymentIntentRequest | null) => {
  return useQuery({
    queryKey: ["paymentIntent", params?.productId, params?.quantity, params?.deliveryMethod],
    queryFn: () => createPaymentIntent(params!),
    enabled: params !== null && !STRIPE_CONFIG.isMockMode,
  });
};
