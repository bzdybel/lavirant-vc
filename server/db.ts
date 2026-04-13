import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./db/schema";
import { getEnv } from "./config/environment";
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
}
