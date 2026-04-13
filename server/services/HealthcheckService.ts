import type { IEmailService } from "./EmailService";
import type { IStripeService } from "./StripeService";
import type { IShippingService } from "./ShippingService";
import { logger } from "../utils/logger";

const MB = 1024 * 1024;
const HEAP_THRESHOLD = 0.8;
const CHECK_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let cleanup: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    cleanup = setTimeout(() => reject(new Error(`Healthcheck timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(cleanup));
}

export interface MemoryCheck {
  used: number;
  total: number;
  healthy: boolean;
}

export interface HealthcheckChecks {
  mailer: boolean;
  memory: MemoryCheck;
  stripe: boolean;
  inpost: boolean;
}

export interface HealthcheckResult {
  status: "ok" | "degraded" | "error";
  checks: HealthcheckChecks;
  timestamp: string;
}

export class HealthcheckService {
  constructor(
    private readonly emailService: IEmailService,
    private readonly stripeService: IStripeService,
    private readonly shippingService: IShippingService
  ) {}

  async run(): Promise<HealthcheckResult> {
    const [mailer, stripe, inpost] = await Promise.all([
      this.checkMailer(),
      this.checkStripe(),
      this.checkInPost(),
    ]);

    const memory = this.checkMemory();
    const status = this.resolveStatus(mailer, stripe, inpost, memory);

    return {
      status,
      checks: { mailer, memory, stripe, inpost },
      timestamp: new Date().toISOString(),
    };
  }

  logResult(result: HealthcheckResult): void {
    const level = result.status === "ok" ? "info" : result.status === "degraded" ? "warn" : "error";
    logger[level]({
      message: "Healthcheck result",
      metadata: {
        status: result.status,
        mailer: result.checks.mailer,
        stripe: result.checks.stripe,
        inpost: result.checks.inpost,
        memoryUsedMB: result.checks.memory.used,
        memoryTotalMB: result.checks.memory.total,
        memoryHealthy: result.checks.memory.healthy,
      },
    });
  }

  private resolveStatus(
    mailer: boolean,
    stripe: boolean,
    inpost: boolean,
    memory: MemoryCheck
  ): HealthcheckResult["status"] {
    if (!memory.healthy) return "error";
    if (!mailer || !stripe || !inpost) return "degraded";
    return "ok";
  }

  private async checkMailer(): Promise<boolean> {
    try {
      return await withTimeout(this.emailService.verify(), CHECK_TIMEOUT_MS);
    } catch {
      return false;
    }
  }

  private async checkStripe(): Promise<boolean> {
    try {
      return await withTimeout(this.stripeService.healthcheck(), CHECK_TIMEOUT_MS);
    } catch {
      return false;
    }
  }

  private async checkInPost(): Promise<boolean> {
    try {
      return await withTimeout(this.shippingService.healthcheck(), CHECK_TIMEOUT_MS);
    } catch {
      return false;
    }
  }

  private checkMemory(): MemoryCheck {
    const mem = process.memoryUsage();
    const used = Math.round(mem.heapUsed / MB);
    const total = Math.round(mem.heapTotal / MB);
    const healthy = mem.heapTotal > 0 && mem.heapUsed / mem.heapTotal < HEAP_THRESHOLD;
    return { used, total, healthy };
  }

}
