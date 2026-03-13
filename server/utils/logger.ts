import winston from "winston";
import { getCorrelationIdSafe } from "./correlationStorage";

function injectCorrelation(data: object): Record<string, unknown> {
  const record = data as Record<string, unknown>;
  if ("correlationId" in record) return record;
  const correlationId = getCorrelationIdSafe();
  if (correlationId === undefined) return record;
  return { correlationId, ...record };
}

const winstonLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

export const logger = {
  info(data: object): void {
    winstonLogger.info(injectCorrelation(data));
  },
  warn(data: object): void {
    winstonLogger.warn(injectCorrelation(data));
  },
  error(data: object): void {
    winstonLogger.error(injectCorrelation(data));
  },
};
