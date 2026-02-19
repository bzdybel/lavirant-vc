import { ValidationError } from "../errors/AppError";
import { DeliveryMethod } from "../constants/deliveryMethods";

/**
 * Validates a positive integer
 */
export function validatePositiveInteger(value: unknown, fieldName: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be a positive integer`);
  }
  return num;
}

/**
 * Validates a required string field
 */
export function validateRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${fieldName} is required`);
  }
  return value.trim();
}

/**
 * Validates email format
 */
export function validateEmail(email: unknown): string {
  const emailStr = validateRequiredString(email, 'Email');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailStr)) {
    throw new ValidationError('Invalid email format');
  }
  return emailStr;
}

/**
 * Validates phone number (basic validation)
 */
export function validatePhone(phone: unknown): string {
  const phoneStr = validateRequiredString(phone, 'Phone');
  // Basic validation - at least 9 digits
  if (!/\d{9,}/.test(phoneStr.replace(/\s|-/g, ''))) {
    throw new ValidationError('Invalid phone number');
  }
  return phoneStr;
}

/**
 * Validates postal code
 */
export function validatePostalCode(postalCode: unknown): string {
  return validateRequiredString(postalCode, 'Postal code');
}

/**
 * Validates delivery method and point consistency
 */
export function validateDeliveryMethod(
  deliveryMethod: unknown,
  deliveryPoint: unknown
): { method: string; isValid: boolean } {
  const method = typeof deliveryMethod === 'string' ? deliveryMethod : '';

  if (method === DeliveryMethod.INPOST_PACZKOMAT) {
    const point = deliveryPoint as any;
    if (!point?.id) {
      throw new ValidationError('InPost delivery point is required for parcel locker delivery');
    }
  }

  return { method, isValid: true };
}

/**
 * Validates customer information object
 */
export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export function validateCustomerInfo(data: unknown): CustomerInfo {
  const obj = data as any;

  return {
    firstName: validateRequiredString(obj.firstName, 'First name'),
    lastName: validateRequiredString(obj.lastName, 'Last name'),
    email: validateEmail(obj.email),
    phone: validatePhone(obj.phone),
    address: validateRequiredString(obj.address, 'Address'),
    city: validateRequiredString(obj.city, 'City'),
    postalCode: validatePostalCode(obj.postalCode),
    country: validateRequiredString(obj.country, 'Country'),
  };
}
