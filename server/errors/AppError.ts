import { HttpStatus, type HttpStatusCode } from "../constants/httpStatus";

/**
 * Base Application Error
 *
 * All custom application errors should extend this class.
 */
export abstract class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error - for invalid input data
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

/**
 * Not Found Error - for missing resources
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, HttpStatus.NOT_FOUND);
  }
}

/**
 * Unauthorized Error - for authentication failures
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

/**
 * Forbidden Error - for authorization failures
 */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, HttpStatus.FORBIDDEN);
  }
}

/**
 * Conflict Error - for resource conflicts (e.g., duplicate entries)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT);
  }
}

/**
 * Service Unavailable Error - for external service failures
 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string, message?: string) {
    super(message || `${service} service is currently unavailable`, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

/**
 * Configuration Error - for missing or invalid configuration
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(`[CONFIG ERROR] ${message}`);
    this.name = "ConfigurationError";
  }
}

/**
 * Payment Error - for payment processing failures
 */
export class PaymentError extends AppError {
  constructor(message: string, statusCode: HttpStatusCode = HttpStatus.BAD_REQUEST) {
    super(message, statusCode);
  }
}

/**
 * Shipping Error - for shipping/fulfillment failures
 */
export class ShippingError extends AppError {
  constructor(message: string, statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR) {
    super(message, statusCode);
  }
}
