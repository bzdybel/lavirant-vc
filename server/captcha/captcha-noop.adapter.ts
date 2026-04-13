import type { CaptchaPort } from "./captcha.port";
import { logger } from "../utils/logger";

export class CaptchaNoopAdapter implements CaptchaPort {
  async verify(_token: string | undefined, ip?: string): Promise<boolean> {
    logger.info({
      message: "Captcha verification bypassed (noop)",
      ...(ip ? { metadata: { ip } } : {}),
    });

    return true;
  }
}
