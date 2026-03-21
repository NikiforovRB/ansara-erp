import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  queryClient: ReturnType<typeof postgres> | undefined;
};

function getClient() {
  if (!globalForDb.queryClient) {
    const sslDisabled = process.env.POSTGRESQL_SSL === "false";
    // Облачные кластеры часто отдают сертификат без цепочки, известной Node —
    // при ssl: "require" запросы падают с TLS-ошибкой в .cause (в UI виден только "Failed query").
    const ssl = sslDisabled
      ? false
      : {
          rejectUnauthorized:
            process.env.POSTGRESQL_SSL_REJECT_UNAUTHORIZED === "true",
        };
    globalForDb.queryClient = postgres({
      host: process.env.POSTGRESQL_HOST ?? "localhost",
      port: Number(process.env.POSTGRESQL_PORT ?? 5432),
      user: process.env.POSTGRESQL_USER ?? "postgres",
      password: process.env.POSTGRESQL_PASSWORD ?? "",
      database: process.env.POSTGRESQL_DBNAME ?? "ansara_erp",
      ssl,
      max: 1,
      prepare: false,
    });
  }
  return globalForDb.queryClient;
}

export const db = drizzle(getClient(), { schema });

export type Db = typeof db;
