import type { CaptchaPort } from "./captcha.port";
import { getEnv } from "../config/environment";
import { logger } from "../utils/logger";

type RecaptchaVerifyResponse = {
  success?: boolean;
};

type Dependencies = {
  secret?: string;
  verifyUrl?: string;
};

export class CaptchaRecaptchaAdapter implements CaptchaPort {
  private static readonly VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
  private readonly secret: string;
  private readonly verifyUrl: string;

  constructor(deps: Dependencies = {}) {
    this.secret = deps.secret ?? (getEnv("CAPTCHA_SECRET") ?? "");
    this.verifyUrl = deps.verifyUrl ?? CaptchaRecaptchaAdapter.VERIFY_URL;
  }

  async verify(token?: string, ip?: string): Promise<boolean> {
    if (!token?.trim()) {
      logger.warn({ message: "Captcha token missing" });
      return false;
    }

    try {
      const params = new URLSearchParams();
      params.append("secret", this.secret);
      params.append("response", token);
      if (ip) {
        params.append("remoteip", ip);
      }

      const response = await fetch(this.verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!response.ok) {
        logger.warn({ message: "Captcha provider response was not OK", status: response.status });
        return false;
      }

      const payload = (await response.json()) as RecaptchaVerifyResponse;
      return payload.success === true;
    } catch (error) {
      logger.error({ message: "Captcha verification request failed", error });
      return false;
    }
  }
}
