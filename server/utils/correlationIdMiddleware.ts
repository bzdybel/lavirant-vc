import type { IdProviderPort } from "./idProviderPort";
import type { HasRequestHeader } from "./requestContextPort";
import { UUID, type UUIDType } from "./uuidVo";

type Dependencies = { IdProvider: IdProviderPort };

export class CorrelationIdMiddleware {
  static readonly HEADER_NAME = "correlation-id";

  constructor(private readonly deps: Dependencies) {}

  evaluate(context: HasRequestHeader): UUIDType {
    const incoming = context.request.header(CorrelationIdMiddleware.HEADER_NAME);

    const existing = UUID.safeParse(incoming);

    if (existing.success) return existing.data;
    return this.deps.IdProvider.generate();
  }
}
