import type { Request, Response } from "express";
import { ListProductsHandler, GetProductHandler } from "../ProductHandlers";
import { storage } from "../../storage";

jest.mock("../../storage", () => ({
  storage: {
    getAllProducts: jest.fn(),
    getProduct: jest.fn(),
  },
}));

type MockedStorage = typeof storage & {
  getAllProducts: jest.Mock;
  getProduct: jest.Mock;
};

function makeResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("ProductHandlers", () => {
  const mockedStorage = storage as MockedStorage;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ListProductsHandler", () => {
    it("returns all products from storage", async () => {
      const products = [
        { id: 1, name: "Product A", price: 100 },
        { id: 2, name: "Product B", price: 200 },
      ];

      mockedStorage.getAllProducts.mockResolvedValue(products);

      const handler = ListProductsHandler();
      const req = {} as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.getAllProducts).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(products);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("returns empty array when no products", async () => {
      mockedStorage.getAllProducts.mockResolvedValue([]);

      const handler = ListProductsHandler();
      const req = {} as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("returns 500 on storage error", async () => {
      mockedStorage.getAllProducts.mockRejectedValue(new Error("Database connection failed"));

      const handler = ListProductsHandler();
      const req = {} as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Database connection failed" });
    });

    it("handles storage error without message", async () => {
      mockedStorage.getAllProducts.mockRejectedValue("Unknown error");

      const handler = ListProductsHandler();
      const req = {} as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: undefined });
    });
  });

  describe("GetProductHandler", () => {
    it("returns product when found", async () => {
      const product = { id: 1, name: "Product A", price: 100 };

      mockedStorage.getProduct.mockResolvedValue(product);

      const handler = GetProductHandler();
      const req = { params: { id: "1" } } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.getProduct).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(product);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("returns 404 when product not found", async () => {
      mockedStorage.getProduct.mockResolvedValue(undefined);

      const handler = GetProductHandler();
      const req = { params: { id: "999" } } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.getProduct).toHaveBeenCalledWith(999);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Product not found" });
    });

    it("returns 500 on storage error", async () => {
      mockedStorage.getProduct.mockRejectedValue(new Error("Query failed"));

      const handler = GetProductHandler();
      const req = { params: { id: "1" } } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Query failed" });
    });

    it("parses productId from params correctly", async () => {
      const product = { id: 42, name: "Special Product", price: 999 };

      mockedStorage.getProduct.mockResolvedValue(product);

      const handler = GetProductHandler();
      const req = { params: { id: "42" } } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.getProduct).toHaveBeenCalledWith(42);
      expect(res.json).toHaveBeenCalledWith(product);
    });

    it("handles invalid productId (NaN)", async () => {
      mockedStorage.getProduct.mockResolvedValue(undefined);

      const handler = GetProductHandler();
      const req = { params: { id: "invalid" } } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.getProduct).toHaveBeenCalledWith(NaN);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Product not found" });
    });

    it("handles zero as valid productId", async () => {
      const product = { id: 0, name: "Product Zero", price: 0 };

      mockedStorage.getProduct.mockResolvedValue(product);

      const handler = GetProductHandler();
      const req = { params: { id: "0" } } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.getProduct).toHaveBeenCalledWith(0);
      expect(res.json).toHaveBeenCalledWith(product);
    });

    it("handles negative productId", async () => {
      mockedStorage.getProduct.mockResolvedValue(undefined);

      const handler = GetProductHandler();
      const req = { params: { id: "-1" } } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(mockedStorage.getProduct).toHaveBeenCalledWith(-1);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns product with all expected fields", async () => {
      const product = {
        id: 1,
        name: "Full Product",
        price: 1500,
        description: "A complete product",
        stock: 10,
      };

      mockedStorage.getProduct.mockResolvedValue(product);

      const handler = GetProductHandler();
      const req = { params: { id: "1" } } as unknown as Request;
      const res = makeResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          name: "Full Product",
          price: 1500,
          description: "A complete product",
          stock: 10,
        })
      );
    });
  });
});
