import type { HealthcheckResult } from "../services/HealthcheckService";
import type { HealthcheckService } from "../services/HealthcheckService";
import { LogPrefix } from "../constants/logPrefixes";
import { logger } from "../utils/logger";

function logResult(result: HealthcheckResult): void {
  const level = result.status === "ok" ? "info" : result.status === "degraded" ? "warn" : "error";
  logger[level]({
    message: `${LogPrefix.HEALTHCHECK} Result`,
    status: result.status,
    mailer: result.checks.mailer,
    stripe: result.checks.stripe,
    inpost: result.checks.inpost,
    memoryUsedMB: result.checks.memory.used,
    memoryTotalMB: result.checks.memory.total,
    memoryHealthy: result.checks.memory.healthy,
  });
}

export function newHealthcheckJob(healthcheckService: HealthcheckService) {
  async function handle(): Promise<void> {
    try {
      const result = await healthcheckService.run();
      logResult(result);
    } catch (error) {
      logger.error({ message: `${LogPrefix.HEALTHCHECK} Job failed unexpectedly`, error });
    }
  }

  return { handle };
}
