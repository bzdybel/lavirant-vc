import dotenv from "dotenv";

const envPath = process.env.DOTENV_CONFIG_PATH ?? ".env";
dotenv.config({ path: envPath });

import { eq } from "drizzle-orm";
import { getDb, initializeDatabase } from "../server/db";
import { products } from "../server/db/schema";
import { productsSeedData } from "../server/db/seedData";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

async function seedProducts() {
  const db = getDb();

  let created = 0;
  let skipped = 0;

  for (const product of productsSeedData) {
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.name, product.name))
      .limit(1);

    if (existing.length > 0 && !FORCE) {
      console.log(`  [skip] "${product.name}" already exists (id=${existing[0].id})`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      const action = existing.length > 0 ? (FORCE ? "update" : "skip") : "insert";
      console.log(`  [dry-run] Would ${action} "${product.name}"`);
      action === "skip" ? skipped++ : created++;
      continue;
    }

    if (existing.length > 0 && FORCE) {
      await db.update(products).set(product).where(eq(products.id, existing[0].id));
      console.log(`  [update] "${product.name}" (id=${existing[0].id})`);
      created++;
    } else {
      const [inserted] = await db.insert(products).values(product).returning({ id: products.id });
      console.log(`  [insert] "${product.name}" (id=${inserted.id})`);
      created++;
    }
  }

  return { created, skipped };
}

async function main() {
  const flags = [DRY_RUN && "dry-run", FORCE && "force"].filter(Boolean);
  console.log(`\n🌱 Seed: products${flags.length ? ` (${flags.join(", ")})` : ""}`);
  console.log("─".repeat(40));

  try {
    await initializeDatabase();

    const result = await seedProducts();

    console.log("─".repeat(40));
    console.log(`Done: ${result.created} created/updated, ${result.skipped} skipped\n`);
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  }
}

main();
