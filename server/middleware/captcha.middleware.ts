import type { RequestHandler } from "express";
import type { CaptchaPort } from "../captcha/captcha.port";
import type { MiddlewareExpressPort } from "../utils/middlewareExpressPort";
import { logger } from "../utils/logger";

type Dependencies = {
  captchaService: CaptchaPort;
};

export class CaptchaMiddleware implements MiddlewareExpressPort {
  private static readonly TOKEN_HEADER = "x-captcha-token";

  constructor(private readonly deps: Dependencies) {}

  handle(): RequestHandler {
    return async (req, res, next) => {
      if (req.method !== "POST") {
        next();
        return;
      }

      const token = this.getToken(req);
      const ip = this.getClientIp(req);

      try {
        const verified = await this.deps.captchaService.verify(token, ip);

        if (!verified) {
          logger.warn({ message: "Captcha verification failed", path: req.path, method: req.method, ...(ip ? { ip } : {}) });
          res.status(403).json({ error: "Captcha verification failed" });
          return;
        }

        logger.info({ message: "Captcha verification passed", path: req.path, method: req.method });
        next();
      } catch (error) {
        logger.error({ message: "Captcha middleware error", path: req.path, method: req.method, error });
        res.status(403).json({ error: "Captcha verification failed" });
      }
    };
  }

  private getToken(req: Parameters<RequestHandler>[0]): string | undefined {
    const headerValue = req.headers[CaptchaMiddleware.TOKEN_HEADER];
    const tokenFromHeader = this.normalizeToken(Array.isArray(headerValue) ? headerValue[0] : headerValue);

    if (tokenFromHeader) {
      return tokenFromHeader;
    }

    return this.normalizeToken(req.body?.captchaToken);
  }

  private getClientIp(req: Parameters<RequestHandler>[0]): string | undefined {
    const forwardedFor = req.headers["x-forwarded-for"];
    const forwardedForValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;

    return forwardedForValue?.split(",")[0]?.trim() || req.socket.remoteAddress || undefined;
  }

  private normalizeToken(token: unknown): string | undefined {
    if (typeof token !== "string") {
      return undefined;
    }

    const trimmedToken = token.trim();
    return trimmedToken.length > 0 ? trimmedToken : undefined;
  }
}
