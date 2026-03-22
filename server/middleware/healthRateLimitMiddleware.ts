import type { RequestHandler } from "express";
import type { MiddlewareExpressPort } from "../utils/middlewareExpressPort";
import { resolveEnv } from "../utils/env";

type IpRecord = { count: number; windowStart: number };

export class HealthRateLimitMiddleware implements MiddlewareExpressPort {
  private readonly store = new Map<string, IpRecord>();
  private readonly max: number;
  private readonly windowMs: number;

  constructor() {
    this.max = parseInt(resolveEnv("RATE_LIMIT_MAX", "10"), 10);
    this.windowMs = parseInt(resolveEnv("RATE_LIMIT_WINDOW_MS", "60000"), 10);
  }

  handle(): RequestHandler {
    return (req, res, next) => {
      const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        "unknown";
      const now = Date.now();

      this.cleanup(now);

      const record = this.store.get(ip);

      if (!record || now - record.windowStart >= this.windowMs) {
        this.store.set(ip, { count: 1, windowStart: now });
        next();
        return;
      }

      if (record.count >= this.max) {
        res.status(429).json({ error: "Too Many Requests" });
        return;
      }

      record.count += 1;
      next();
    };
  }

  private cleanup(now: number): void {
    for (const [ip, record] of this.store.entries()) {
      if (now - record.windowStart >= this.windowMs) {
        this.store.delete(ip);
      }
    }
  }
}
