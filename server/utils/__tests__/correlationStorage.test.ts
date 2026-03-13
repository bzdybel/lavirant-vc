import { CorrelationStorage, getCorrelationIdSafe } from "../correlationStorage";

const VALID_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("CorrelationStorage", () => {
  test("run - sync", () => {
    CorrelationStorage.run(VALID_ID, () => {
      expect(CorrelationStorage.get()).toEqual(VALID_ID);
    });
  });

  test("run - async", async () => {
    await CorrelationStorage.run(VALID_ID, async () => {
      expect(CorrelationStorage.get()).toEqual(VALID_ID);
    });
  });

  test("async boundary - ALS context survives await", async () => {
    await CorrelationStorage.run(VALID_ID, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(CorrelationStorage.get()).toEqual(VALID_ID);
    });
  });

  test("run - outside context throws", () => {
    expect(() => CorrelationStorage.get()).toThrow("correlation.storage.missing");
  });

  test("run - nested contexts are isolated", () => {
    CorrelationStorage.run("outer-id-aaa-aaaa-aaaaaaaaaaaa", () => {
      expect(CorrelationStorage.get()).toEqual("outer-id-aaa-aaaa-aaaaaaaaaaaa");

      CorrelationStorage.run("inner-id-bbb-bbbb-bbbbbbbbbbbb", () => {
        expect(CorrelationStorage.get()).toEqual("inner-id-bbb-bbbb-bbbbbbbbbbbb");
      });

      expect(CorrelationStorage.get()).toEqual("outer-id-aaa-aaaa-aaaaaaaaaaaa");
    });
  });

  test("global symbol is stable", () => {
    expect(CorrelationStorage.GLOBAL_KEY).toEqual(Symbol.for("bgord.CorrelationStorage"));
  });
});

describe("getCorrelationIdSafe", () => {
  test("returns correlationId inside an ALS context", () => {
    CorrelationStorage.run(VALID_ID, () => {
      expect(getCorrelationIdSafe()).toEqual(VALID_ID);
    });
  });

  test("returns undefined outside an ALS context", () => {
    expect(getCorrelationIdSafe()).toBeUndefined();
  });
});
