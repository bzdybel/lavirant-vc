import type { RequestHandler } from "express";
import type { MiddlewareExpressPort } from "../utils/middlewareExpressPort";
import { resolveEnv } from "../utils/env";

export class HealthTimeoutMiddleware implements MiddlewareExpressPort {
  private readonly timeoutMs: number;

  constructor() {
    this.timeoutMs = parseInt(resolveEnv("HEALTH_TIMEOUT_MS", "2000"), 10);
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
