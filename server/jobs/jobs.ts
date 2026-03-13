import { Cron } from "croner";
import { newPaymentStatusJob } from "./PaymentStatusJob";
import { newShipXPollingJob } from "./ShipXPollingJob";
import { newHealthcheckJob } from "./HealthcheckJob";
import type { IStripeService } from "../services/StripeService";
import type { PaymentStatusService } from "../services/PaymentStatusService";
import type { HealthcheckService } from "../services/HealthcheckService";
import { AppConfig } from "../config/appConfig";
import { logger } from "../utils/logger";
import { JobHandlerWithLoggerStrategy } from "../utils/jobHandlerWithLoggerStrategy";
import { IdProviderUuidAdapter } from "../utils/idProviderUuidAdapter";
import { ClockDateAdapter } from "../utils/clockDateAdapter";

export function initJobs(
  stripeService: IStripeService,
  paymentStatusService: PaymentStatusService,
  healthcheckService: HealthcheckService
): void {
  const jobStrategy = new JobHandlerWithLoggerStrategy({
    Logger: logger,
    IdProvider: new IdProviderUuidAdapter(),
    Clock: new ClockDateAdapter(),
  });

  const paymentJob = newPaymentStatusJob(stripeService, paymentStatusService);
  const healthcheckJob = newHealthcheckJob(healthcheckService);

  const paymentIntervalMinutes = AppConfig.PAYMENT_STATUS_JOB_INTERVAL_MINUTES;
  const paymentPattern = `*/${paymentIntervalMinutes} * * * *`;

  new Cron(paymentPattern, { protect: true }, () =>
    jobStrategy.handle({ label: "payment_status_job", process: paymentJob.handle })()
  );

  if (AppConfig.INPOST_API_SHIPX) {
    const shipxIntervalMinutes = AppConfig.SHIPX_POLLING_JOB_INTERVAL_MINUTES;
    const shipxPattern = `*/${shipxIntervalMinutes} * * * *`;
    const shipxJob = newShipXPollingJob();

    new Cron(shipxPattern, { protect: true }, () =>
      jobStrategy.handle({ label: "shipx_polling_job", process: shipxJob.handle })()
    );
  } else {
    logger.info({ message: "ShipX polling skipped: INPOST_API_SHIPX not configured." });
  }

  new Cron("*/30 * * * *", { protect: true }, () =>
    jobStrategy.handle({ label: "healthcheck_job", process: healthcheckJob.handle })()
  );
  logger.info({ message: "[Healthcheck] Scheduled job registered (every 30 minutes)" });
}
