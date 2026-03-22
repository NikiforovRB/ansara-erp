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

/** Синхронизация схемы с БД без ручного migrate (колонки из новых миграций). */
export async function ensureDocumentsLinkTitleColumn() {
  try {
    await getClient().unsafe(
      "ALTER TABLE documents ADD COLUMN IF NOT EXISTS link_title varchar(512)",
    );
  } catch (e) {
    console.warn("[db] ensureDocumentsLinkTitleColumn:", e);
  }
}

export async function ensureBacklogListColumns() {
  const c = getClient();
  try {
    await c.unsafe(
      `DO $$ BEGIN CREATE TYPE backlog_list_status AS ENUM ('not_started', 'in_progress', 'completed', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    );
    await c.unsafe(
      `ALTER TABLE backlog_lists ADD COLUMN IF NOT EXISTS list_status backlog_list_status NOT NULL DEFAULT 'not_started';`,
    );
    await c.unsafe(`ALTER TABLE backlog_lists ADD COLUMN IF NOT EXISTS formed_at date;`);
    await c.unsafe(`UPDATE backlog_lists SET formed_at = CURRENT_DATE WHERE formed_at IS NULL;`);
    await c.unsafe(`ALTER TABLE backlog_lists ALTER COLUMN formed_at SET DEFAULT CURRENT_DATE;`);
    try {
      await c.unsafe(`ALTER TABLE backlog_lists ALTER COLUMN formed_at SET NOT NULL;`);
    } catch {
      /* уже задано */
    }
  } catch (e) {
    console.warn("[db] ensureBacklogListColumns:", e);
  }
}

export async function ensureTimelineDescriptionAndStagesComment() {
  const c = getClient();
  try {
    await c.unsafe(
      `ALTER TABLE timeline_entries ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';`,
    );
    await c.unsafe(
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS lk_stages_comment text;`,
    );
  } catch (e) {
    console.warn("[db] ensureTimelineDescriptionAndStagesComment:", e);
  }
}
