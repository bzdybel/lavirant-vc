import type { ValidationResult, CustomerFormData } from './types';
import content from '@/lib/content.json';

const { errors } = content.checkout;

const REGEX = {
  NAME: /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[0-9]+$/,
  POSTAL_CODE: /^\d{2}-\d{3}$/,
} as const;

export const validateCustomerData = (data: CustomerFormData): ValidationResult => {
  // Check for required fields
  const requiredFields = Object.values(data);
  if (requiredFields.some(field => !field)) {
    return {
      isValid: false,
      error: errors.required,
      description: "Proszę wypełnić wszystkie wymagane pola"
    };
  }

  // Validate names
  if (!REGEX.NAME.test(data.firstName) || !REGEX.NAME.test(data.lastName)) {
    return {
      isValid: false,
      error: errors.invalidName
    };
  }

  // Validate email
  if (!REGEX.EMAIL.test(data.email)) {
    return {
      isValid: false,
      error: errors.invalidEmail
    };
  }

  // Validate phone
  if (!REGEX.PHONE.test(data.phone)) {
    return {
      isValid: false,
      error: errors.invalidPhone
    };
  }

  // Validate postal code
  if (!REGEX.POSTAL_CODE.test(data.postalCode)) {
    return {
      isValid: false,
      error: errors.invalidPostalCode
    };
  }

  return { isValid: true };
};

export const sanitizeName = (value: string): string => {
  return value.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]/g, '');
};

export const sanitizePhone = (value: string): string => {
  return value.replace(/[^0-9]/g, '');
};

export const formatPostalCode = (value: string): string => {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.length > 2) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}`;
  }
  return digits;
};
