import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

/**
 * Logging Middleware
 *
 * Logs API requests with timing and response information.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestPath = req.path;
  // Capture synchronously while guaranteed inside the CorrelationStorage.run() context;
  // req.correlationId is set by CorrelationExpressMiddleware before this middleware runs.
  const correlationId = req.correlationId;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Log incoming request
  if (requestPath.startsWith("/api")) {
    logger.info({
      message: "API Request",
      method: req.method,
      path: requestPath,
      ...(correlationId !== undefined ? { correlationId } : {}),
    });
  }

  // Intercept res.json to capture response body
  const originalResJson = res.json.bind(res);
  res.json = function (bodyJson: any) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson);
  };

  // Log response after it finishes
  res.on("finish", () => {
    const duration = Date.now() - start;

    if (requestPath.startsWith("/api")) {
      logger.info({
        message: "API Response",
        method: req.method,
        path: requestPath,
        statusCode: res.statusCode,
        durationMs: duration,
        ...(capturedJsonResponse !== undefined ? { responseBody: capturedJsonResponse } : {}),
        ...(correlationId !== undefined ? { correlationId } : {}),
      });
    }
  });

  next();
}
