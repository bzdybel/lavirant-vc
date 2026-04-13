import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { products } from "../db/schema";
import { InsufficientStockError } from "../errors/AppError";
import { logger } from "../utils/logger";

export class StockService {
  /**
   * Validates that sufficient stock is available for the requested quantity.
   * Throws InsufficientStockError if not.
   */
  static async validateStock(productId: number, quantity: number): Promise<void> {
    const db = getDb();

    const [product] = await db
      .select({ id: products.id, availableQuantity: products.availableQuantity })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return; // Product existence is validated elsewhere
    }

    if (product.availableQuantity < quantity) {
      throw new InsufficientStockError(productId, quantity, product.availableQuantity);
    }
  }

  /**
   * Atomically decreases product stock after successful payment.
   * Uses a raw SQL UPDATE with a WHERE guard to prevent negative stock.
   * Returns true if stock was successfully decremented, false if insufficient.
   */
  static async decrementStock(productId: number, quantity: number): Promise<boolean> {
    const db = getDb();

    const [before] = await db
      .select({ availableQuantity: products.availableQuantity })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    const beforeQty = before?.availableQuantity ?? 0;

    // Atomic decrement with guard: only update if enough stock remains
    const result = await db
      .update(products)
      .set({
        availableQuantity: sql`${products.availableQuantity} - ${quantity}`,
      })
      .where(
        sql`${products.id} = ${productId} AND ${products.availableQuantity} >= ${quantity}`,
      )
      .returning({ id: products.id, availableQuantity: products.availableQuantity });

    if (result.length === 0) {
      logger.warn({
        message: "Stock decrement failed — insufficient stock",
        metadata: { productId, requested: quantity, available: beforeQty },
      });
      return false;
    }

    logger.info({
      message: "Stock decremented",
      metadata: {
        productId,
        quantity,
        before: beforeQty,
        after: result[0].availableQuantity,
      },
    });

    return true;
  }
}
