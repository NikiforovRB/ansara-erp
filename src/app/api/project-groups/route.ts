import { asc, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { projectGroups } from "@/lib/db/schema";

const createSchema = z.object({
  title: z.string().trim().min(1),
});

export async function GET() {
  await requireUser();
  const rows = await db.select().from(projectGroups).orderBy(asc(projectGroups.sortOrder));
  return Response.json({ groups: rows });
}

export async function POST(req: Request) {
  await requireUser();
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  }

  const [agg] = await db
    .select({
      m: sql<number>`coalesce(max(${projectGroups.sortOrder}), -1)`.mapWith(Number),
    })
    .from(projectGroups);

  const [created] = await db
    .insert(projectGroups)
    .values({
      title: parsed.data.title,
      sortOrder: (agg?.m ?? -1) + 1,
    })
    .returning();
  return Response.json({ group: created });
}

