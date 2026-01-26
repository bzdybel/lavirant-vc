import type { CreateOrderRequest } from "@/services/orderService";

const STORAGE_KEY = 'checkout_form_data';

interface SavedFormData {
  productId: number;
  quantity: number;
  deliveryMethod?: "INPOST_PACZKOMAT" | "INPOST_KURIER";
  deliveryPoint?: {
    id: string;
  };
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export function saveFormDataForRedirect(formData: SavedFormData): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
}

export function clearSavedFormData(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function retrieveSavedFormData(): SavedFormData | null {
  const savedData = sessionStorage.getItem(STORAGE_KEY);

  if (!savedData) {
    return null;
  }

  try {
    return JSON.parse(savedData);
  } catch (error) {
    console.error('Failed to parse saved form data:', error);
    return null;
  }
}

export function createOrderFromSavedData(
  paymentIntentId: string,
  savedData: SavedFormData
): CreateOrderRequest {
  return {
    productId: savedData.productId,
    quantity: savedData.quantity,
    paymentIntentId,
    deliveryMethod: savedData.deliveryMethod,
    deliveryPoint: savedData.deliveryPoint,
    firstName: savedData.firstName,
    lastName: savedData.lastName,
    email: savedData.email,
    phone: savedData.phone,
    address: savedData.address,
    city: savedData.city,
    postalCode: savedData.postalCode,
    country: savedData.country,
  };
}

export function getPaymentIntentClientSecret(): string | null {
  return new URLSearchParams(window.location.search).get('payment_intent_client_secret');
}
