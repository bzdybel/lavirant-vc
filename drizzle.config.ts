import { defineConfig } from "drizzle-kit";

const getDatabaseUrl = () => process.env.DATABASE_URL ?? "";

export default defineConfig({
  out: "./migrations",
  schema: "./server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    get url() {
      return getDatabaseUrl();
    },
  },
});
