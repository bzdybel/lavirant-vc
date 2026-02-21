import type { Request, Response } from "express";
import { storage } from "../storage";

export function ListProductsHandler() {
  return async (_req: Request, res: Response) => {
    try {
      const products = await storage.getAllProducts();
      return res.json(products);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  };
}

export function GetProductHandler() {
  return async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      return res.json(product);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  };
}
