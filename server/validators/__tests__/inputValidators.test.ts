import {
  validatePositiveInteger,
  validateRequiredString,
  validateEmail,
  validatePhone,
  validatePostalCode,
  validateDeliveryMethod,
  validateCustomerInfo,
} from '../inputValidators';
import { DeliveryMethod } from '../../constants/deliveryMethods';
import { ValidationError } from '../../errors/AppError';

describe('inputValidators', () => {
  describe('validatePositiveInteger', () => {
    it('should accept valid positive integers', () => {
      expect(validatePositiveInteger(1, 'quantity')).toBe(1);
      expect(validatePositiveInteger(100, 'quantity')).toBe(100);
      expect(validatePositiveInteger('42', 'quantity')).toBe(42);
    });

    it('should reject zero', () => {
      expect(() => validatePositiveInteger(0, 'quantity')).toThrow(ValidationError);
      expect(() => validatePositiveInteger(0, 'quantity')).toThrow('quantity must be a positive integer');
    });

    it('should reject negative numbers', () => {
      expect(() => validatePositiveInteger(-1, 'quantity')).toThrow(ValidationError);
      expect(() => validatePositiveInteger(-100, 'quantity')).toThrow('quantity must be a positive integer');
    });

    it('should reject non-integer numbers', () => {
      expect(() => validatePositiveInteger(3.14, 'quantity')).toThrow(ValidationError);
      expect(() => validatePositiveInteger(1.5, 'quantity')).toThrow('quantity must be a positive integer');
    });

    it('should reject non-numeric strings', () => {
      expect(() => validatePositiveInteger('abc', 'quantity')).toThrow(ValidationError);
      expect(() => validatePositiveInteger('12.5', 'quantity')).toThrow(ValidationError);
    });

    it('should reject null and undefined', () => {
      expect(() => validatePositiveInteger(null, 'quantity')).toThrow(ValidationError);
      expect(() => validatePositiveInteger(undefined, 'quantity')).toThrow(ValidationError);
    });

    it('should reject NaN and Infinity', () => {
      expect(() => validatePositiveInteger(NaN, 'quantity')).toThrow(ValidationError);
      expect(() => validatePositiveInteger(Infinity, 'quantity')).toThrow(ValidationError);
    });
  });

  describe('validateRequiredString', () => {
    it('should accept valid non-empty strings', () => {
      expect(validateRequiredString('test', 'fieldName')).toBe('test');
      expect(validateRequiredString('hello world', 'fieldName')).toBe('hello world');
    });

    it('should trim whitespace from valid strings', () => {
      expect(validateRequiredString('  test  ', 'fieldName')).toBe('test');
      expect(validateRequiredString('\n\ttrimmed\t\n', 'fieldName')).toBe('trimmed');
    });

    it('should reject empty strings', () => {
      expect(() => validateRequiredString('', 'fieldName')).toThrow(ValidationError);
      expect(() => validateRequiredString('', 'fieldName')).toThrow('fieldName is required');
    });

    it('should reject whitespace-only strings', () => {
      expect(() => validateRequiredString('   ', 'name')).toThrow(ValidationError);
      expect(() => validateRequiredString('\n\t', 'name')).toThrow('name is required');
    });

    it('should reject non-string types', () => {
      expect(() => validateRequiredString(123, 'fieldName')).toThrow(ValidationError);
      expect(() => validateRequiredString(null, 'fieldName')).toThrow(ValidationError);
      expect(() => validateRequiredString(undefined, 'fieldName')).toThrow(ValidationError);
      expect(() => validateRequiredString({}, 'fieldName')).toThrow(ValidationError);
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('user@example.com')).toBe('user@example.com');
      expect(validateEmail('test.name+tag@domain.co.uk')).toBe('test.name+tag@domain.co.uk');
      expect(validateEmail('a@b.c')).toBe('a@b.c');
    });

    it('should reject emails without @ symbol', () => {
      expect(() => validateEmail('userexample.com')).toThrow(ValidationError);
      expect(() => validateEmail('userexample.com')).toThrow('Invalid email format');
    });

    it('should reject emails without domain', () => {
      expect(() => validateEmail('user@')).toThrow(ValidationError);
      expect(() => validateEmail('user@.com')).toThrow(ValidationError);
    });

    it('should reject emails without TLD', () => {
      expect(() => validateEmail('user@domain')).toThrow(ValidationError);
    });

    it('should reject empty and whitespace-only emails', () => {
      expect(() => validateEmail('')).toThrow(ValidationError);
      expect(() => validateEmail('   ')).toThrow(ValidationError);
    });

    it('should reject non-string emails', () => {
      expect(() => validateEmail(null)).toThrow(ValidationError);
      expect(() => validateEmail(undefined)).toThrow(ValidationError);
    });

    it('should trim whitespace from emails', () => {
      expect(validateEmail('  user@example.com  ')).toBe('user@example.com');
    });
  });

  describe('validatePhone', () => {
    it('should accept valid phone numbers', () => {
      expect(validatePhone('123456789')).toBe('123456789');
      expect(validatePhone('+48 123 456 789')).toBe('+48 123 456 789');
      expect(validatePhone('123-456-789')).toBe('123-456-789');
    });

    it('should accept phone numbers with spaces and hyphens', () => {
      expect(validatePhone('555-1234567')).toBe('555-1234567');
      expect(validatePhone('+1 555-1234567')).toBe('+1 555-1234567');
    });

    it('should reject phone numbers with fewer than 9 digits', () => {
      expect(() => validatePhone('12345678')).toThrow(ValidationError);
      expect(() => validatePhone('123456789')).not.toThrow(); // exactly 9 digits should pass
    });

    it('should reject empty and whitespace-only phones', () => {
      expect(() => validatePhone('')).toThrow(ValidationError);
      expect(() => validatePhone('   ')).toThrow(ValidationError);
    });

    it('should reject non-string phones', () => {
      expect(() => validatePhone(null)).toThrow(ValidationError);
      expect(() => validatePhone(undefined)).toThrow(ValidationError);
    });

    it('should trim whitespace from phone numbers', () => {
      expect(validatePhone('  123456789  ')).toBe('123456789');
    });
  });

  describe('validatePostalCode', () => {
    it('should accept non-empty postal codes', () => {
      expect(validatePostalCode('12345')).toBe('12345');
      expect(validatePostalCode('90210')).toBe('90210');
      expect(validatePostalCode('SW1A 1AA')).toBe('SW1A 1AA');
    });

    it('should trim whitespace', () => {
      expect(validatePostalCode('  12345  ')).toBe('12345');
    });

    it('should reject empty postal codes', () => {
      expect(() => validatePostalCode('')).toThrow(ValidationError);
      expect(() => validatePostalCode('   ')).toThrow(ValidationError);
    });

    it('should reject non-string postal codes', () => {
      expect(() => validatePostalCode(null)).toThrow(ValidationError);
      expect(() => validatePostalCode(undefined)).toThrow(ValidationError);
    });
  });

  describe('validateDeliveryMethod', () => {
    it('should validate standard delivery methods', () => {
      const result = validateDeliveryMethod('standard', undefined);
      expect(result.method).toBe('standard');
      expect(result.isValid).toBe(true);
    });

    it('should accept InPost delivery without point for non-parcel methods', () => {
      const result = validateDeliveryMethod('inpost_parcel', undefined);
      expect(result.method).toBe('inpost_parcel');
      expect(result.isValid).toBe(true);
    });

    it('should require delivery point for InPost parcel locker', () => {
      expect(() =>
        validateDeliveryMethod(DeliveryMethod.INPOST_PACZKOMAT, undefined)
      ).toThrow(ValidationError);
      expect(() =>
        validateDeliveryMethod(DeliveryMethod.INPOST_PACZKOMAT, undefined)
      ).toThrow('InPost delivery point is required for parcel locker delivery');
    });

    it('should require delivery point ID for InPost parcel locker', () => {
      expect(() =>
        validateDeliveryMethod(DeliveryMethod.INPOST_PACZKOMAT, { name: 'Locker' })
      ).toThrow(ValidationError);
    });

    it('should accept valid InPost parcel locker with point', () => {
      const result = validateDeliveryMethod(DeliveryMethod.INPOST_PACZKOMAT, {
        id: 'WAW001',
        name: 'Locker',
      });
      expect(result.method).toBe(DeliveryMethod.INPOST_PACZKOMAT);
      expect(result.isValid).toBe(true);
    });

    it('should handle null and non-string delivery methods', () => {
      const result = validateDeliveryMethod(null, undefined);
      expect(result.method).toBe('');
      expect(result.isValid).toBe(true);

      const result2 = validateDeliveryMethod(123, undefined);
      expect(result2.method).toBe('');
      expect(result2.isValid).toBe(true);
    });
  });

  describe('validateCustomerInfo', () => {
    const validCustomerInfo = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '123456789',
      address: '123 Main St',
      city: 'New York',
      postalCode: '10001',
      country: 'USA',
    };

    it('should accept valid customer info', () => {
      const result = validateCustomerInfo(validCustomerInfo);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.phone).toBe('123456789');
      expect(result.address).toBe('123 Main St');
      expect(result.city).toBe('New York');
      expect(result.postalCode).toBe('10001');
      expect(result.country).toBe('USA');
    });

    it('should trim whitespace from all fields', () => {
      const result = validateCustomerInfo({
        firstName: '  John  ',
        lastName: '  Doe  ',
        email: '  john@example.com  ',
        phone: '  123456789  ',
        address: '  123 Main St  ',
        city: '  New York  ',
        postalCode: '  10001  ',
        country: '  USA  ',
      });
      expect(result.firstName).toBe('John');
      expect(result.email).toBe('john@example.com');
    });

    it('should reject missing firstName', () => {
      const invalid = { ...validCustomerInfo, firstName: '' };
      expect(() => validateCustomerInfo(invalid)).toThrow(ValidationError);
    });

    it('should reject missing lastName', () => {
      const invalid = { ...validCustomerInfo, lastName: undefined };
      expect(() => validateCustomerInfo(invalid)).toThrow(ValidationError);
    });

    it('should reject invalid email', () => {
      const invalid = { ...validCustomerInfo, email: 'not-an-email' };
      expect(() => validateCustomerInfo(invalid)).toThrow(ValidationError);
    });

    it('should reject invalid phone', () => {
      const invalid = { ...validCustomerInfo, phone: '12345' };
      expect(() => validateCustomerInfo(invalid)).toThrow(ValidationError);
    });

    it('should reject missing address', () => {
      const invalid = { ...validCustomerInfo, address: '   ' };
      expect(() => validateCustomerInfo(invalid)).toThrow(ValidationError);
    });

    it('should reject missing city', () => {
      const invalid = { ...validCustomerInfo, city: null };
      expect(() => validateCustomerInfo(invalid)).toThrow(ValidationError);
    });

    it('should reject missing postalCode', () => {
      const invalid = { ...validCustomerInfo, postalCode: '' };
      expect(() => validateCustomerInfo(invalid)).toThrow(ValidationError);
    });

    it('should reject missing country', () => {
      const invalid = { ...validCustomerInfo, country: undefined };
      expect(() => validateCustomerInfo(invalid)).toThrow(ValidationError);
    });

    it('should reject partially provided data', () => {
      expect(() => validateCustomerInfo({})).toThrow(ValidationError);
      expect(() => validateCustomerInfo({ firstName: 'John' })).toThrow(ValidationError);
    });

    it('should reject non-object input', () => {
      expect(() => validateCustomerInfo(null)).toThrow();
      expect(() => validateCustomerInfo('invalid')).toThrow();
    });

    it('should accumulate all validation errors for multiple invalid fields', () => {
      const invalid = {
        firstName: '',
        lastName: '',
        email: 'invalid',
        phone: '123',
        address: '',
        city: '',
        postalCode: '',
        country: '',
      };
      expect(() => validateCustomerInfo(invalid)).toThrow(ValidationError);
    });
  });
});
