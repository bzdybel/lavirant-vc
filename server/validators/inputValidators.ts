import { z } from "zod";
import { ValidationError } from "../errors/AppError";
import { DeliveryMethod } from "../constants/deliveryMethods";

// ---------------------------------------------------------------------------
// Branded Zod schemas — "Parse, don't validate" (Alexis King)
//
// Each schema is the single source of truth for both the parsing logic AND
// the resulting type. Callers receive a narrow branded type (e.g. `Email`)
// instead of a raw `string`, so the type system prevents accidentally
// passing unvalidated input where validated data is expected.
// ---------------------------------------------------------------------------

const NonEmptyStringSchema = z.string().trim().min(1).brand<"NonEmptyString">();
export type NonEmptyString = z.infer<typeof NonEmptyStringSchema>;

const EmailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Invalid email format")
  .brand<"Email">();
export type Email = z.infer<typeof EmailSchema>;

const PhoneSchema = z
  .string()
  .trim()
  .min(1, "Phone is required")
  .refine((val) => /\d{9,}/.test(val.replace(/[\s-]/g, "")), "Invalid phone number")
  .brand<"Phone">();
export type Phone = z.infer<typeof PhoneSchema>;

const PostalCodeSchema = z
  .string()
  .trim()
  .min(1, "Postal code is required")
  .brand<"PostalCode">();
export type PostalCode = z.infer<typeof PostalCodeSchema>;

// ---------------------------------------------------------------------------
// Internal helper — maps Zod failures to domain ValidationError
// ---------------------------------------------------------------------------

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Public parsing functions
// ---------------------------------------------------------------------------

export function validatePositiveInteger(value: unknown, fieldName: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be a positive integer`);
  }
  return num;
}

export function validateRequiredString(value: unknown, fieldName: string): NonEmptyString {
  const result = z.string().trim().min(1, `${fieldName} is required`).safeParse(value);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message);
  }
  return result.data as NonEmptyString;
}

export function validateEmail(email: unknown): Email {
  return parseOrThrow(EmailSchema, email);
}

export function validatePhone(phone: unknown): Phone {
  return parseOrThrow(PhoneSchema, phone);
}

export function validatePostalCode(postalCode: unknown): PostalCode {
  return parseOrThrow(PostalCodeSchema, postalCode);
}

export function validateDeliveryMethod(
  deliveryMethod: unknown,
  deliveryPoint: unknown
): { method: string; isValid: boolean } {
  const method = typeof deliveryMethod === "string" ? deliveryMethod : "";

  if (method === DeliveryMethod.INPOST_PACZKOMAT) {
    const point = deliveryPoint as { id?: unknown } | null | undefined;
    if (!point?.id) {
      throw new ValidationError("InPost delivery point is required for parcel locker delivery");
    }
  }

  return { method, isValid: true };
}

// ---------------------------------------------------------------------------
// CustomerInfo — all fields carry their precise branded types, making it
// impossible at the type level to put unvalidated strings into this struct.
// ---------------------------------------------------------------------------

export interface CustomerInfo {
  firstName: NonEmptyString;
  lastName: NonEmptyString;
  email: Email;
  phone: Phone;
  address: NonEmptyString;
  city: NonEmptyString;
  postalCode: PostalCode;
  country: NonEmptyString;
}

export function validateCustomerInfo(data: unknown): CustomerInfo {
  const obj = data as Record<string, unknown>;

  return {
    firstName: validateRequiredString(obj.firstName, "First name"),
    lastName: validateRequiredString(obj.lastName, "Last name"),
    email: validateEmail(obj.email),
    phone: validatePhone(obj.phone),
    address: validateRequiredString(obj.address, "Address"),
    city: validateRequiredString(obj.city, "City"),
    postalCode: validatePostalCode(obj.postalCode),
    country: validateRequiredString(obj.country, "Country"),
  };
}
