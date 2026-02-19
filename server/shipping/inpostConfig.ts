import { requireEnv, resolveEnv } from "../config/env";

export interface InPostConfig {
  token: string;
  organizationId: string;
  serviceLocker: string;
  serviceCourier: string;
  parcelTemplate: string;
  parcelDimensions: {
    length: string;
    width: string;
    height: string;
    unit: "mm";
  };
  parcelWeight: {
    amount: string;
    unit: "kg";
  };
  sender: {
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    buildingNumber: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

export function getInpostConfig(): InPostConfig | null {
  const token = resolveEnv("INPOST_API_SHIPX");
  if (!token) return null;

  const organizationId = resolveEnv("INPOST_SHIPX_ORG_ID");
  if (!organizationId) return null;

  return {
    token,
    organizationId,
    serviceLocker: resolveEnv("INPOST_SERVICE_LOCKER", "inpost_locker_standard"),
    serviceCourier: resolveEnv("INPOST_SERVICE_COURIER", "inpost_courier_standard"),
    parcelTemplate: resolveEnv("INPOST_PARCEL_TEMPLATE", "small"),
    parcelDimensions: {
      length: resolveEnv("INPOST_PARCEL_LENGTH_MM", "80"),
      width: resolveEnv("INPOST_PARCEL_WIDTH_MM", "360"),
      height: resolveEnv("INPOST_PARCEL_HEIGHT_MM", "640"),
      unit: "mm",
    },
    parcelWeight: {
      amount: resolveEnv("INPOST_PARCEL_WEIGHT_KG", "2"),
      unit: "kg",
    },
    sender: {
      companyName: requireEnv("INVOICE_SELLER_NAME"),
      firstName: requireEnv("INVOICE_SELLER_FIRST_NAME"),
      lastName: requireEnv("INVOICE_SELLER_LAST_NAME"),
      email: requireEnv("INVOICE_SELLER_EMAIL"),
      phone: requireEnv("INVOICE_SELLER_PHONE"),
      street: requireEnv("INVOICE_SELLER_STREET"),
      buildingNumber: requireEnv("INVOICE_SELLER_BUILDING"),
      city: requireEnv("INVOICE_SELLER_CITY"),
      postalCode: requireEnv("INVOICE_SELLER_POST_CODE"),
      country: "PL",
    },
  };
}
