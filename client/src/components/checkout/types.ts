export interface CustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  description?: string;
}
