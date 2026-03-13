import { CorrelationExpressMiddleware } from "../correlationExpressMiddleware";
import { IdProviderUuidAdapter } from "../../utils/idProviderUuidAdapter";
import { CorrelationStorage } from "../../utils/correlationStorage";
import { makeRequest, makeResponse } from "../../__tests__/helpers/httpMocks";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makeMiddleware() {
  return new CorrelationExpressMiddleware({ IdProvider: new IdProviderUuidAdapter() }).handle();
}

function makeRes() {
  return Object.assign(makeResponse(), { setHeader: jest.fn() }) as any;
}

describe("CorrelationExpressMiddleware", () => {
  test("uses incoming valid correlation-id header", (done) => {
    const middleware = makeMiddleware();
    const req = makeRequest({ headers: { "correlation-id": VALID_UUID } }) as any;
    const res = makeRes();

    middleware(req, res, () => {
      expect(req.correlationId).toEqual(VALID_UUID);
      expect(res.setHeader).toHaveBeenCalledWith("correlation-id", VALID_UUID);
      done();
    });
  });

  test("generates a UUID v4 when header is absent", (done) => {
    const middleware = makeMiddleware();
    const req = makeRequest({ headers: {} }) as any;
    const res = makeRes();

    middleware(req, res, () => {
      expect(req.correlationId).toMatch(UUID_V4_REGEX);
      expect(res.setHeader).toHaveBeenCalledWith("correlation-id", req.correlationId);
      done();
    });
  });

  test("ALS context survives async boundary inside next (HTTP propagation)", async () => {
    const middleware = makeMiddleware();
    const req = makeRequest({ headers: { "correlation-id": VALID_UUID } }) as any;
    const res = makeRes();

    let storageId: string | undefined;

    const done = new Promise<void>((resolve) => {
      const next = async () => {
        // simulate async work in a route handler after the middleware
        await new Promise((r) => setTimeout(r, 5));
        storageId = CorrelationStorage.get();
        resolve();
      };
      middleware(req, res, next as any);
    });

    await done;

    expect(storageId).toEqual(VALID_UUID);
    // storage and request-attached id are in sync
    expect(storageId).toEqual(req.correlationId);
  });

  test("ALS context is isolated between concurrent requests", async () => {
    const middleware = makeMiddleware();
    const UUID_A = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
    const UUID_B = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

    const reqA = makeRequest({ headers: { "correlation-id": UUID_A } }) as any;
    const reqB = makeRequest({ headers: { "correlation-id": UUID_B } }) as any;
    const resA = makeRes();
    const resB = makeRes();

    const [idA, idB] = await Promise.all([
      new Promise<string>((resolve) => {
        const next = async () => {
          await new Promise((r) => setTimeout(r, 10));
          resolve(CorrelationStorage.get());
        };
        middleware(reqA, resA, next as any);
      }),
      new Promise<string>((resolve) => {
        const next = async () => {
          await new Promise((r) => setTimeout(r, 5));
          resolve(CorrelationStorage.get());
        };
        middleware(reqB, resB, next as any);
      }),
    ]);

    expect(idA).toEqual(UUID_A);
    expect(idB).toEqual(UUID_B);
  });
});
