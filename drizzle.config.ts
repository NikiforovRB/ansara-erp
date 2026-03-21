import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.POSTGRESQL_HOST ?? "localhost",
    port: Number(process.env.POSTGRESQL_PORT ?? 5432),
    user: process.env.POSTGRESQL_USER ?? "postgres",
    password: process.env.POSTGRESQL_PASSWORD ?? "",
    database: process.env.POSTGRESQL_DBNAME ?? "ansara_erp",
    ssl: process.env.POSTGRESQL_SSL !== "false" ? { rejectUnauthorized: false } : false,
  },
});
