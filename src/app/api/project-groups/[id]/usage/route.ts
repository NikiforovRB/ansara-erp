import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  await requireAdmin();
  const { id } = await ctx.params;
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`.mapWith(Number),
    })
    .from(projects)
    .where(eq(projects.groupId, id));
  return Response.json({ projectCount: row?.count ?? 0 });
}
