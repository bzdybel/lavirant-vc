import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "./db/schema";
import { products } from "./db/schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("[DB] DATABASE_URL is not set. Database connection is required.");
}

const pool = new Pool({ connectionString: DATABASE_URL });

export const db = drizzle(pool, { schema });

const REQUIRED_TABLES = ["users", "products", "orders", "shipments", "webhook_events"];

export async function initializeDatabase(): Promise<void> {
  try {
    await pool.query("select 1");
  } catch (error) {
    console.error("[DB] Failed to connect to PostgreSQL", error);
    throw error;
  }

  const result = await pool.query(
    "select table_name from information_schema.tables where table_schema = 'public'"
  );
  const existing = new Set(result.rows.map((row) => String(row.table_name)));
  const missing = REQUIRED_TABLES.filter((table) => !existing.has(table));

  if (missing.length > 0) {
    throw new Error(`[DB] Missing tables: ${missing.join(", ")}. Run migrations before starting.`);
  }

  console.log("[DB] Connected to PostgreSQL");

  // Light-weight schema sanity check
  await db.execute(sql`select 1`);

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(products);
  if (Number(count) === 0) {
    await db.insert(products).values({
      name: "Lavirant",
      description: "Pełna edycja z aplikacją mobilną. Intensywna gra towarzyska łącząca logiczne myślenie, umiejętność czytania ludzi i perfekcyjne kłamstwo. Idealna na imprezy i wieczory ze znajomymi.",
      price: 29900,
      image: "/image.png",
      category: "Gry planszowe",
    });
    console.log("[DB] Seeded default product");
  }
}
