import type { Request, Response } from "express";
import type { HealthcheckService, HealthcheckResult } from "../services/HealthcheckService";
import { LogPrefix } from "../constants/logPrefixes";
import { logger } from "../utils/logger";

const ERROR_RESULT: HealthcheckResult = {
  status: "error",
  checks: {
    mailer: false,
    stripe: false,
    inpost: false,
    memory: { used: 0, total: 0, healthy: false },
  },
  timestamp: "",
};

export function HealthcheckHandler(healthcheckService: HealthcheckService) {
  return async (_req: Request, res: Response) => {
    try {
      const result = await healthcheckService.run();
      const httpStatus = result.status === "error" ? 503 : 200;
      return res.status(httpStatus).json(result);
    } catch (error) {
      logger.error({ message: `${LogPrefix.HEALTHCHECK} Unexpected handler failure`, error });
      return res.status(503).json({ ...ERROR_RESULT, timestamp: new Date().toISOString() });
    }
  };
}
