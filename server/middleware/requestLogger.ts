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

  // Intercept res.json to capture response
  const originalResJson = res.json.bind(res);
  res.json = function (bodyJson: any) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson);
  };

  // Log after response finishes
  res.on("finish", () => {
    const duration = Date.now() - start;

    // Only log API requests
    if (requestPath.startsWith("/api")) {
      let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;

      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      // Truncate long log lines
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }

      logger.info({ message: logLine, ...(correlationId !== undefined ? { correlationId } : {}) });
    }
  });

  next();
}
