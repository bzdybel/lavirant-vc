import type { PaymentStatus } from "../enums/paymentStatus";
import type { InpostDeliveryMethod } from "./inpost";

export interface Order {
  id: number;
  userId?: number | null;
  productId?: number | null;
  quantity: number;
  total: number;
  deliveryCost?: number | null;
  deliveryMethod?: InpostDeliveryMethod | null;
  deliveryPointId?: string | null;
  status: PaymentStatus | string;
  shipmentId?: string | null;
  shipmentStatus?: string | null;
  trackingNumber?: string | null;
  labelGenerated?: boolean | null;
  paymentIntentId?: string | null;
  paymentProvider?: string | null;
  paymentReference?: string | null;
  paymentPendingAt?: string | null;
  paymentConfirmedAt?: string | null;
  invoiceNumber?: string | null;
  invoicePdfPath?: string | null;
  invoiceIssuedAt?: string | null;
  emailSentAt?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  createdAt: string;
}
