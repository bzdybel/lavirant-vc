import { Cron } from "croner";
import { newPaymentStatusJob } from "./PaymentStatusJob";
import { newShipXPollingJob } from "./ShipXPollingJob";
import { newHealthcheckJob } from "./HealthcheckJob";
import type { IStripeService } from "../services/StripeService";
import type { PaymentStatusService } from "../services/PaymentStatusService";
import type { HealthcheckService } from "../services/HealthcheckService";
import { AppConfig } from "../config/appConfig";
import { logger } from "../utils/logger";

export function initJobs(
  stripeService: IStripeService,
  paymentStatusService: PaymentStatusService,
  healthcheckService: HealthcheckService
): void {
  const paymentIntervalMinutes = AppConfig.PAYMENT_STATUS_JOB_INTERVAL_MINUTES;
  const paymentPattern = `*/${paymentIntervalMinutes} * * * *`;

  new Cron(paymentPattern, { protect: true }, newPaymentStatusJob(stripeService, paymentStatusService).handle);

  if (AppConfig.INPOST_API_SHIPX) {
    const shipxIntervalMinutes = AppConfig.SHIPX_POLLING_JOB_INTERVAL_MINUTES;
    const shipxPattern = `*/${shipxIntervalMinutes} * * * *`;

    new Cron(shipxPattern, { protect: true }, newShipXPollingJob().handle);
  } else {
    logger.info({ message: "ShipX polling skipped: INPOST_API_SHIPX not configured." });
  }

  new Cron("*/30 * * * *", { protect: true }, newHealthcheckJob(healthcheckService).handle);
  logger.info({ message: "[Healthcheck] Scheduled job registered (every 30 minutes)" });
}
