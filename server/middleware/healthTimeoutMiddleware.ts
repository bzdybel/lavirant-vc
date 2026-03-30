import type { RequestHandler } from "express";
import type { MiddlewareExpressPort } from "../utils/middlewareExpressPort";
import { getEnv } from "../config/environment";

export class HealthTimeoutMiddleware implements MiddlewareExpressPort {
  private readonly timeoutMs: number;

  constructor() {
    this.timeoutMs = getEnv("HEALTH_TIMEOUT_MS");
  }

  handle(): RequestHandler {
    return (req, res, next) => {
      let finished = false;

      const timer = setTimeout(() => {
        if (finished || res.headersSent) {
          return;
        }

        finished = true;
        if (!res.headersSent) {
          res.status(503).json({ error: "Service Unavailable" });
        }
      }, this.timeoutMs);

      res.on("finish", () => {
        finished = true;
        clearTimeout(timer);
      });

      next();
    };
  }
}
