import winston from "winston";
import type { CorrelationIdType } from "./correlationIdVo";
import { getCorrelationIdSafe } from "./correlationStorage";
import type { LogKeyType } from "../constants/logKeys";

export type LogMetadata = Partial<Record<LogKeyType, unknown>> & Record<string, unknown>;

export type LogCoreType = {
  message: string;
  timestamp?: string;
  correlationId?: CorrelationIdType;
  metadata?: LogMetadata;
  error?: unknown;
  [key: string]: unknown;
};

const winstonLogger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

function buildEntry(data: LogCoreType) {
  const { timestamp, correlationId, ...rest } = data;
  return {
    timestamp: timestamp ?? new Date().toISOString(),
    correlationId: correlationId ?? getCorrelationIdSafe(),
    ...rest,
  };
}

export const logger = {
  info(data: LogCoreType): void {
    winstonLogger.info(buildEntry(data));
  },
  warn(data: LogCoreType): void {
    winstonLogger.warn(buildEntry(data));
  },
  error(data: LogCoreType): void {
    winstonLogger.error(buildEntry(data));
  },
};

/**
 * Structured log helper — enforces message + metadata convention.
 */
export function logEvent(
  level: "info" | "warn" | "error",
  message: string,
  metadata?: Record<string, unknown>
): void {
  logger[level]({ message, ...(metadata ? { metadata } : {}) });
}
