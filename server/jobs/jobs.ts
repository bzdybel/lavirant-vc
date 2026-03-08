import { Cron } from "croner";
import { newPaymentStatusJob } from "./PaymentStatusJob";
import { newShipXPollingJob } from "./ShipXPollingJob";
import type { IStripeService } from "../services/StripeService";
import type { PaymentStatusService } from "../services/PaymentStatusService";
import { AppConfig } from "../config/appConfig";
import { logger } from "../utils/logger";

export function initJobs(
  stripeService: IStripeService,
  paymentStatusService: PaymentStatusService
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
}
