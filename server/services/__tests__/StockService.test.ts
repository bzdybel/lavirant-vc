import { StockService } from "../StockService";
import { InsufficientStockError } from "../../errors/AppError";
import { getDb } from "../../db";

jest.mock("../../db", () => ({
  getDb: jest.fn(),
}));

jest.mock("../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

function mockDb(overrides: Record<string, jest.Mock> = {}) {
  const chain: any = {};

  chain.select = jest.fn().mockReturnValue(chain);
  chain.from = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockResolvedValue([]);
  chain.update = jest.fn().mockReturnValue(chain);
  chain.set = jest.fn().mockReturnValue(chain);
  chain.returning = jest.fn().mockResolvedValue([]);

  Object.assign(chain, overrides);

  (getDb as jest.Mock).mockReturnValue(chain);
  return chain;
}

describe("StockService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateStock", () => {
    it("should pass when sufficient stock is available", async () => {
      const db = mockDb();
      db.limit.mockResolvedValue([{ id: 1, availableQuantity: 10 }]);

      await expect(StockService.validateStock(1, 5)).resolves.toBeUndefined();
    });

    it("should pass when stock equals requested quantity", async () => {
      const db = mockDb();
      db.limit.mockResolvedValue([{ id: 1, availableQuantity: 3 }]);

      await expect(StockService.validateStock(1, 3)).resolves.toBeUndefined();
    });

    it("should throw InsufficientStockError when stock is insufficient", async () => {
      const db = mockDb();
      db.limit.mockResolvedValue([{ id: 1, availableQuantity: 2 }]);

      await expect(StockService.validateStock(1, 5)).rejects.toThrow(InsufficientStockError);
    });

    it("should throw InsufficientStockError with correct details", async () => {
      const db = mockDb();
      db.limit.mockResolvedValue([{ id: 1, availableQuantity: 2 }]);

      try {
        await StockService.validateStock(1, 5);
        fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientStockError);
        const e = error as InsufficientStockError;
        expect(e.productId).toBe(1);
        expect(e.requested).toBe(5);
        expect(e.available).toBe(2);
        expect(e.statusCode).toBe(409);
      }
    });

    it("should throw InsufficientStockError when stock is zero", async () => {
      const db = mockDb();
      db.limit.mockResolvedValue([{ id: 1, availableQuantity: 0 }]);

      await expect(StockService.validateStock(1, 1)).rejects.toThrow(InsufficientStockError);
    });

    it("should not throw when product not found (validated elsewhere)", async () => {
      const db = mockDb();
      db.limit.mockResolvedValue([]);

      await expect(StockService.validateStock(999, 1)).resolves.toBeUndefined();
    });
  });

  describe("decrementStock", () => {
    it("should return true and log when decrement succeeds", async () => {
      const db = mockDb();
      // First call: select (before qty)
      db.limit.mockResolvedValueOnce([{ availableQuantity: 10 }]);
      // returning() from update
      db.returning.mockResolvedValueOnce([{ id: 1, availableQuantity: 7 }]);

      const result = await StockService.decrementStock(1, 3);

      expect(result).toBe(true);
    });

    it("should return false when insufficient stock for decrement", async () => {
      const db = mockDb();
      db.limit.mockResolvedValueOnce([{ availableQuantity: 2 }]);
      db.returning.mockResolvedValueOnce([]);

      const result = await StockService.decrementStock(1, 5);

      expect(result).toBe(false);
    });
  });
});
