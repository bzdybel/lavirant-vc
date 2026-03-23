import type { Request, Response } from "express";
import type { HealthcheckService } from "../services/HealthcheckService";

export function HealthcheckHandler(healthcheckService: HealthcheckService) {
  return async (_req: Request, res: Response) => {
    const result = await healthcheckService.run();
    const httpStatus = result.status === "error" ? 503 : 200;
    return res.status(httpStatus).json(result);
  };
}
