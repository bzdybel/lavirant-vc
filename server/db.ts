import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./db/schema";
import { products } from "./db/schema";
import { getEnv } from "./config/environment";
import { sql } from "drizzle-orm";
import { logger } from "./utils/logger";

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!dbInstance) {
    const databasePath = getEnv("DATABASE_PATH");
    const sqlite = new Database(databasePath);
    dbInstance = drizzle(sqlite, { schema });
  }
  return dbInstance;
}

export async function initializeDatabase(): Promise<void> {
  const db = getDb();

  const migrationsFolder = path.resolve(process.cwd(), "migrations");
  migrate(db, { migrationsFolder });
  logger.info({ message: "[DB] Migrations applied" });

  logger.info({ message: "[DB] Connected to SQLite" });

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(products);
  if (Number(count) === 0) {
    await db.insert(products).values({
      name: "Lavirant",
      description: "Pełna edycja z aplikacją mobilną. Intensywna gra towarzyska łącząca logiczne myślenie, umiejętność czytania ludzi i perfekcyjne kłamstwo. Idealna na imprezy i wieczory ze znajomymi.",
      price: 29900,
      image: "/image.png",
      category: "Gry planszowe",
    });
    logger.info({ message: "[DB] Seeded default product" });
  }
}
