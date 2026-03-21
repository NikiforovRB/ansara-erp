/**
 * Drizzle оборачивает ошибку Postgres в DrizzleQueryError: в .cause лежит реальная причина (код, detail).
 */
export function formatDbError(e: unknown): string {
  if (!e || typeof e !== "object") return String(e);
  const err = e as Error & {
    cause?: unknown;
    code?: string;
    detail?: string;
    hint?: string;
    severity?: string;
  };

  const pgBits: string[] = [];
  const appendPg = (x: unknown) => {
    if (!x || typeof x !== "object") return;
    if (x instanceof Error) {
      const o = x as Error & {
        code?: string;
        detail?: string;
        hint?: string;
      };
      if (o.message) pgBits.push(o.message);
      if (o.code) pgBits.push(`code=${o.code}`);
      if (o.detail) pgBits.push(o.detail);
      if (o.hint) pgBits.push(`hint: ${o.hint}`);
      const nested = (x as { cause?: unknown }).cause;
      if (nested) appendPg(nested);
    }
  };

  appendPg(err.cause);

  const head = err.message || String(e);
  if (pgBits.length === 0) return head;
  return `${head} | ${pgBits.join(" | ")}`;
}
