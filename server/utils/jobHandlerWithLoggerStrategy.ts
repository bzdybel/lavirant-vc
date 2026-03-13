import type { ClockPort } from "./clockPort";
import { CorrelationStorage } from "./correlationStorage";
import type { IdProviderPort } from "./idProviderPort";
import type { JobHandlerStrategy, UnitOfWork } from "./jobHandlerStrategy";
import type { LoggerPort } from "./loggerPort";
import { Stopwatch } from "./stopwatch";

type Dependencies = { Logger: LoggerPort; IdProvider: IdProviderPort; Clock: ClockPort };

export class JobHandlerWithLoggerStrategy implements JobHandlerStrategy {
  private readonly base = { component: "infra", operation: "job_handler" };

  constructor(private readonly deps: Dependencies) {}

  handle(uow: UnitOfWork): () => Promise<void> {
    const correlationId = this.deps.IdProvider.generate();

    return async () => {
      const duration = new Stopwatch(this.deps);

      try {
        this.deps.Logger.info({ message: `${uow.label} start`, correlationId, ...this.base });

        await CorrelationStorage.run(correlationId, async () => uow.process());

        this.deps.Logger.info({
          message: `${uow.label} success`,
          correlationId,
          metadata: duration.stop(),
          ...this.base,
        });
      } catch (error) {
        this.deps.Logger.error({
          message: `${uow.label} error`,
          correlationId,
          error,
          metadata: duration.stop(),
          ...this.base,
        });
      }
    };
  }
}
