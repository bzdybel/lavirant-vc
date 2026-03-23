import winston from "winston";
import type { CorrelationIdType } from "./correlationIdVo";
import { getCorrelationIdSafe } from "./correlationStorage";

export type LogCoreType = {
  timestamp: string;
  message: string;
  correlationId?: CorrelationIdType;
  metadata?: Record<string, any>;
};

type LogInputType = Record<string, unknown>;

function normalizeLog(data: LogInputType): LogCoreType {
  const {
    message,
    timestamp,
    correlationId,
    metadata,
    ...rest
  } = data;

  const normalizedMessage = typeof message === "string" ? message : String(message ?? "");
  const normalizedTimestamp = typeof timestamp === "string" ? timestamp : new Date().toISOString();
  const normalizedCorrelationId =
    typeof correlationId === "string" ? (correlationId as CorrelationIdType) : getCorrelationIdSafe();

  const explicitMetadata =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, any>)
      : undefined;

  const mergedMetadata: Record<string, any> = {
    ...rest,
    ...(explicitMetadata ?? {}),
  };

  return {
    timestamp: normalizedTimestamp,
    message: normalizedMessage,
    ...(normalizedCorrelationId !== undefined ? { correlationId: normalizedCorrelationId } : {}),
    ...(Object.keys(mergedMetadata).length > 0 ? { metadata: mergedMetadata } : {}),
  };
}

const winstonLogger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export const logger = {
  info(data: LogInputType): void {
    winstonLogger.info(normalizeLog(data));
  },
  warn(data: LogInputType): void {
    winstonLogger.warn(normalizeLog(data));
  },
  error(data: LogInputType): void {
    winstonLogger.error(normalizeLog(data));
  },
};
