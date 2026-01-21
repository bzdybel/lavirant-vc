import { API_ENDPOINTS } from "@/config/checkout.config";

export interface CreateOrderRequest {
  productId: number;
  quantity: number;
  paymentIntentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export const createOrder = async (data: CreateOrderRequest) => {
  const response = await fetch(API_ENDPOINTS.orders, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    const text = (await response.text()) || response.statusText;
    throw new Error(`${response.status}: ${text}`);
  }

  return response.json();
};
