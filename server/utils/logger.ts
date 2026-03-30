import winston from "winston";
import type { CorrelationIdType } from "./correlationIdVo";
import { getCorrelationIdSafe } from "./correlationStorage";

export type LogCoreType = {
  message: string;
  timestamp?: string;
  correlationId?: CorrelationIdType;
  metadata?: Record<string, any>;
  [key: string]: unknown;
};

const winstonLogger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export const logger = {
  info(data: LogCoreType): void {
    const { timestamp, correlationId, ...rest } = data;
    winstonLogger.info({
      timestamp: timestamp ?? new Date().toISOString(),
      correlationId: correlationId ?? getCorrelationIdSafe(),
      ...rest,
    });
  },
  warn(data: LogCoreType): void {
    const { timestamp, correlationId, ...rest } = data;
    winstonLogger.warn({
      timestamp: timestamp ?? new Date().toISOString(),
      correlationId: correlationId ?? getCorrelationIdSafe(),
      ...rest,
    });
  },
  error(data: LogCoreType): void {
    const { timestamp, correlationId, ...rest } = data;
    winstonLogger.error({
      timestamp: timestamp ?? new Date().toISOString(),
      correlationId: correlationId ?? getCorrelationIdSafe(),
      ...rest,
    });
  },
};
