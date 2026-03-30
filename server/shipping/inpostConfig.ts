import { getEnv } from "../config/environment";

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
  const token = getEnv("INPOST_API_SHIPX");
  if (!token) return null;

  const organizationId = getEnv("INPOST_SHIPX_ORG_ID");
  if (!organizationId) return null;

  return {
    token,
    organizationId,
    serviceLocker: getEnv("INPOST_SERVICE_LOCKER"),
    serviceCourier: getEnv("INPOST_SERVICE_COURIER"),
    parcelTemplate: getEnv("INPOST_PARCEL_TEMPLATE"),
    parcelDimensions: {
      length: String(getEnv("INPOST_PARCEL_LENGTH_MM")),
      width: String(getEnv("INPOST_PARCEL_WIDTH_MM")),
      height: String(getEnv("INPOST_PARCEL_HEIGHT_MM")),
      unit: "mm",
    },
    parcelWeight: {
      amount: String(getEnv("INPOST_PARCEL_WEIGHT_KG")),
      unit: "kg",
    },
    sender: {
      companyName: getEnv("INVOICE_SELLER_NAME") ?? "",
      firstName: getEnv("INVOICE_SELLER_FIRST_NAME") ?? "",
      lastName: getEnv("INVOICE_SELLER_LAST_NAME") ?? "",
      email: getEnv("INVOICE_SELLER_EMAIL") ?? "",
      phone: getEnv("INVOICE_SELLER_PHONE") ?? "",
      street: getEnv("INVOICE_SELLER_STREET") ?? "",
      buildingNumber: getEnv("INVOICE_SELLER_BUILDING") ?? "",
      city: getEnv("INVOICE_SELLER_CITY") ?? "",
      postalCode: getEnv("INVOICE_SELLER_POST_CODE") ?? "",
      country: "PL",
    },
  };
}
