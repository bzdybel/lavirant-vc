import type { Request, Response } from "express";
import { AppConfig } from "../config/appConfig";

export function GetInPostConfigHandler() {
  return (_req: Request, res: Response) => {
    const isProduction = AppConfig.IS_PRODUCTION;
    const geowidgetToken = AppConfig.getGeowidgetToken();

    return res.json({
      enabled: Boolean(geowidgetToken),
      geowidgetToken: geowidgetToken || null,
      environment: isProduction ? "production" : "sandbox",
    });
  };
}
