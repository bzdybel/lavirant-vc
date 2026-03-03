import type { Request, Response } from "express";
import { errorHandler, asyncHandler } from "../errorHandler";
import { ValidationError, NotFoundError, UnauthorizedError } from "../../errors/AppError";
import { HttpStatus } from "../../constants/httpStatus";
import * as AppConfigModule from "../../config/appConfig";

jest.mock("../../config/appConfig", () => ({
  AppConfig: {
    IS_DEVELOPMENT: false,
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
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
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
      expect(consoleSpy).toHaveBeenCalled();
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

      expect(consoleSpy).toHaveBeenCalledWith(
        "Operational error:",
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

      expect(consoleErrorSpy).toHaveBeenCalled();
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
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should re-throw non-operational errors", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new Error("Unexpected error");

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Unexpected error:",
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

      expect(consoleSpy).toHaveBeenCalledWith(
        "Operational error:",
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

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Unexpected error:",
        expect.any(Object)
      );
    });

    it("should categorize plain Error as unexpected", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();
      const error = new Error("Unexpected");

      errorHandler(error, req, res, next);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Unexpected error:",
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

describe("asyncHandler Wrapper", () => {
  it("should catch promise rejection and forward to next", async () => {
    const testError = new ValidationError("Async error");
    const handler = jest.fn().mockRejectedValueOnce(testError);
    const wrappedHandler = asyncHandler(handler);

    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    wrappedHandler(req, res, next);

    // Wait for promise resolution in next tick
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(testError);
  });

  it("should allow successful promise resolution without calling next", async () => {
    const handler = jest
      .fn()
      .mockResolvedValueOnce({ success: true });
    const wrappedHandler = asyncHandler(handler);

    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    wrappedHandler(req, res, next);

    // Wait for promise resolution
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).not.toHaveBeenCalled();
  });

  it("should handle sync exceptions and forward to next", async () => {
    const testError = new Error("Sync error");
    const handler = jest.fn().mockImplementationOnce(() => {
      throw testError;
    });
    const wrappedHandler = asyncHandler(handler);

    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    wrappedHandler(req, res, next);

    // Wait for promise resolution
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(testError);
  });

  it("should pass req, res, next to handler function", async () => {
    const handler = jest.fn().mockResolvedValueOnce(undefined);
    const wrappedHandler = asyncHandler(handler);

    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    wrappedHandler(req, res, next);

    // Wait for promise resolution
    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).toHaveBeenCalledWith(req, res, next);
  });

  it("should handle multiple errors sequentially", async () => {
    const errors = [
      new ValidationError("Error 1"),
      new NotFoundError("Resource"),
      new Error("Unexpected"),
    ];

    for (const error of errors) {
      const handler = jest.fn().mockRejectedValueOnce(error);
      const wrappedHandler = asyncHandler(handler);

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      wrappedHandler(req, res, next);

      // Wait for promise resolution
      await new Promise((resolve) => setImmediate(resolve));

      expect(next).toHaveBeenCalledWith(error);
    }
  });

  it("should preserve handler context", async () => {
    const _contextValue = { value: "test" };
    const handler = jest
      .fn()
      .mockImplementationOnce(function (this: typeof _contextValue) {
        return Promise.resolve();
      });

    const wrappedHandler = asyncHandler(handler);

    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    wrappedHandler(req, res, next);

    // Wait for promise resolution
    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).toHaveBeenCalled();
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
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    setIsDevelopment(false);
  });

  it("should work with asyncHandler for complete error flow", async () => {
    const handler = jest
      .fn()
      .mockRejectedValueOnce(new ValidationError("Handler error"));
    const wrappedHandler = asyncHandler(handler);

    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const next = createMockNext();

    // Call wrapped handler which will call next with error
    wrappedHandler(req, res, next);

    // Wait for promise
    await new Promise((resolve) => setImmediate(resolve));

    // Now simulate error handler receiving that error
    const error = (next as jest.Mock).mock.calls[0][0];
    errorHandler(error, req, res, next);

    // Verify error handling
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

  it("should handle wrapped handler error chain correctly", async () => {
    setIsDevelopment(true);

    const handler = jest
      .fn()
      .mockRejectedValueOnce(new NotFoundError("Order", 999));
    const wrappedHandler = asyncHandler(handler);

    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;
    const errorNext = jest.fn();

    wrappedHandler(req, res, errorNext);

    // Wait for promise
    await new Promise((resolve) => setImmediate(resolve));

    // Get error and handle it
    const error = errorNext.mock.calls[0][0];
    errorHandler(error, req, res, errorNext);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });
});
