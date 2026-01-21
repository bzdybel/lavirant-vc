import { useQuery } from '@tanstack/react-query';
import { apiRequest } from "@/lib/queryClient";

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
}

interface ProductResponse {
  id: number;
  name: string;
  price: number;
  image: string;
}

interface PaymentIntentResponse {
  clientSecret: string;
}

const fetchProduct = async (productId: string): Promise<Product> => {
  const res = await apiRequest("GET", `/api/products/${productId}`);
  const data: ProductResponse = await res.json();
  return {
    id: data.id,
    name: data.name,
    price: data.price / 100, // Convert from cents
    image: data.image
  };
};

const createPaymentIntent = async (price: number): Promise<string> => {
  const res = await apiRequest("POST", "/api/create-payment-intent", { amount: price });
  const data: PaymentIntentResponse = await res.json();
  return data.clientSecret;
};

export const useProduct = (productId: string) => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId),
  });
};

export const usePaymentIntent = (price: number | null) => {
  return useQuery({
    queryKey: ['paymentIntent', price],
    queryFn: () => createPaymentIntent(price!),
    enabled: price !== null,
  });
};
