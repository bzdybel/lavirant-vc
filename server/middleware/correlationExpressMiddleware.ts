import type { RequestHandler } from "express";
import { CorrelationIdMiddleware } from "../utils/correlationIdMiddleware";
import { CorrelationStorage } from "../utils/correlationStorage";
import type { IdProviderPort } from "../utils/idProviderPort";
import type { MiddlewareExpressPort } from "../utils/middlewareExpressPort";
import { RequestContextExpressAdapter } from "../utils/requestContextExpressAdapter";
import type { UUIDType } from "../utils/uuidVo";

type Dependencies = { IdProvider: IdProviderPort };

declare global {
  namespace Express {
    interface Request {
      correlationId: UUIDType;
    }
  }
}

export class CorrelationExpressMiddleware implements MiddlewareExpressPort {
  private readonly correlationId: CorrelationIdMiddleware;

  constructor(deps: Dependencies) {
    this.correlationId = new CorrelationIdMiddleware(deps);
  }

  handle(): RequestHandler {
    return (request, response, next) => {
      const context = new RequestContextExpressAdapter(request);

      const result = this.correlationId.evaluate(context);

      request.correlationId = result;
      response.setHeader(CorrelationIdMiddleware.HEADER_NAME, result);

      CorrelationStorage.run(result, () => next());
    };
  }
}
