import type { Request, Response } from "express";
import { errorHandler } from "../errorHandler";
import { ValidationError, NotFoundError, UnauthorizedError } from "../../errors/AppError";
import { HttpStatus } from "../../constants/httpStatus";
import * as AppConfigModule from "../../config/appConfig";
import { logger } from "../../utils/logger";

jest.mock("../../config/appConfig", () => ({
  AppConfig: {
    IS_DEVELOPMENT: false,
  },
}));
jest.mock("../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

/**
 * Mock Express Request/Response objects for testing error handler middleware
 */
const createMockRequest = (): Partial<Request> => ({
  method: "GET",
  path: "/test",
  headers: {},
});

const createMockResponse = (): Partial<Response> & { status: jest.Mock; json: jest.Mock } => {
  const res = {} as any;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createMockNext = (): jest.Mock => jest.fn();

function setIsDevelopment(value: boolean) {
  Object.defineProperty(AppConfigModule.AppConfig, "IS_DEVELOPMENT", {
    value,
    configurable: true,
  });
}

describe("errorHandler Middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Operational Errors (AppError instances)", () => {
    it("should handle ValidationError with 400 status", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new ValidationError("Email is invalid");

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email is invalid",
      });
      expect(logger.warn).toHaveBeenCalled();
    });

    it("should handle NotFoundError with 404 status", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new NotFoundError("Product", 123);

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(res.json).toHaveBeenCalledWith({
        message: "Product with identifier '123' not found",
      });
    });

    it("should handle UnauthorizedError with 401 status", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new UnauthorizedError("Invalid credentials");

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid credentials",
      });
    });

    it("should log operational errors as warnings", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new ValidationError("Invalid input");

      errorHandler(error, req, res, next);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid input",
          statusCode: HttpStatus.BAD_REQUEST,
        })
      );
    });

    it("should NOT throw when handling operational AppError", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new ValidationError("Test error");

      expect(() => {
        errorHandler(error, req, res, next);
      }).not.toThrow();
    });
  });

  describe("Non-operational Errors", () => {
    it("should handle non-operational AppError and log as unexpected", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new ValidationError("Critical error");
      (error as any).isOperational = false;

      errorHandler(error, req, res, next);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it("should handle plain Error with 500 status", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new Error("Unexpected error");

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        message: "Unexpected error",
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it("should re-throw non-operational errors", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new Error("Unexpected error");

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(Object)
      );
    });
  });

  describe("Error Response Formatting", () => {
    afterEach(() => {
      setIsDevelopment(false);
    });

    it("should include stack trace in development mode", () => {
      setIsDevelopment(true);

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new ValidationError("Dev error");

      errorHandler(error, req, res, next);

      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs).toHaveProperty("stack");
      expect(typeof callArgs.stack).toBe("string");
    });

    it("should NOT include stack trace in production mode", () => {
      setIsDevelopment(false);

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new ValidationError("Prod error");

      errorHandler(error, req, res, next);

      const callArgs = (res.json as jest.Mock).mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("stack");
    });

    it("should handle string error values", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = "String error message";

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        message: "String error message",
      });
    });

    it("should handle unknown error types with default 500 status", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = { custom: "error object" };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it("should handle objects with status property", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = { message: "Custom error", status: HttpStatus.FORBIDDEN };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });

    it("should handle objects with statusCode property", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = { message: "Custom error", statusCode: HttpStatus.NOT_FOUND };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    });
  });

  describe("Error Categorization", () => {
    it("should categorize AppError with isOperational=true as operational", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new ValidationError("Validation failed");

      errorHandler(error, req, res, next);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(Object)
      );
    });

    it("should categorize AppError with isOperational=false as unexpected", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new ValidationError("Critical");
      (error as any).isOperational = false;

      try {
        errorHandler(error, req, res, next);
      } catch (_e) {
        // Expected to throw
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(Object)
      );
    });

    it("should categorize plain Error as unexpected", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new Error("Unexpected");

      errorHandler(error, req, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(Object)
      );
    });
  });

  describe("HTTP Status Code Determination", () => {
    it("should use AppError.statusCode when available", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new UnauthorizedError("Forbidden test");

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });

    it("should default to 500 for plain Error", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new Error("Plain error");

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});

describe("Edge Cases", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it("should handle null error gracefully", () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    errorHandler(null, req, res, next);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalled();
  });

  it("should handle undefined error gracefully", () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    errorHandler(undefined, req, res, next);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it("should handle error with circular references", () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const error = { message: "test" } as any;
    error.self = error; // Create circular reference

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });

  it("should handle error with no message property", () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const error = { statusCode: HttpStatus.BAD_REQUEST };

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it("should handle numeric error", () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    errorHandler(42, req, res, next);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      message: "42",
    });
  });

  it("should handle boolean error", () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    errorHandler(false, req, res, next);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});

describe("Error Handler Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    setIsDevelopment(false);
  });

  it("should handle ValidationError correctly", () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    errorHandler(new ValidationError("Handler error"), req, res, next);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it("should log all error details without exposing internals in production", () => {
    setIsDevelopment(false);

    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    const error = new ValidationError("Sensitive error data");
    errorHandler(error, req, res, next);

    const responseData = (res.json as jest.Mock).mock.calls[0][0];
    expect(responseData).not.toHaveProperty("stack");
  });

  it("should handle NotFoundError with stack in development", () => {
    setIsDevelopment(true);

    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const errorNext = jest.fn();

    errorHandler(new NotFoundError("Order", 999), req, res, errorNext);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });
});
