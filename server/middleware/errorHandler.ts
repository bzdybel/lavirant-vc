import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { HttpStatus } from "../constants/httpStatus";

/**
 * Error Response Interface
 */
interface ErrorResponse {
  message: string;
  statusCode?: number;
  stack?: string;
}

/**
 * Checks if error is an operational/expected error
 */
function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Formats error for JSON response
 */
function formatErrorResponse(error: unknown, includeStack = false): ErrorResponse {
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      ...(includeStack && { stack: error.stack }),
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      ...(includeStack && { stack: error.stack }),
    };
  }

  return {
    message: String(error),
  };
}

/**
 * Determines HTTP status code from error
 */
function getStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  // Check for common error patterns
  if (error && typeof error === 'object') {
    const err = error as any;
    if (err.status) return err.status;
    if (err.statusCode) return err.statusCode;
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

/**
 * Central error handling middleware
 *
 * Handles all errors thrown in the application and sends appropriate responses.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = getStatusCode(err);
  const includeStack = process.env.NODE_ENV === "development";
  const errorResponse = formatErrorResponse(err, includeStack);

  // Log error details
  if (isOperationalError(err)) {
    console.warn("Operational error:", errorResponse);
  } else {
    console.error("Unexpected error:", errorResponse);
  }

  res.status(statusCode).json({
    message: errorResponse.message,
    ...(includeStack && errorResponse.stack && { stack: errorResponse.stack })
  });

  // Re-throw non-operational errors for process handling
  if (!isOperationalError(err)) {
    throw err;
  }
}

/**
 * Async handler wrapper
 *
 * Wraps async route handlers to automatically catch and forward errors to error handler.
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void | Response>
) {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
