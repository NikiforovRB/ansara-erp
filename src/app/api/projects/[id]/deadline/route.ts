import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { projectDeadlines, projects } from "@/lib/db/schema";

const putSchema = z.object({
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  comment: z.string().optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  await requireUser();
  const { id } = await ctx.params;
  const [p] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!p) return Response.json({ error: "Не найдено" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  }
  const { startAt, endAt, comment } = parsed.data;

  await db
    .insert(projectDeadlines)
    .values({
      projectId: id,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      comment: comment ?? null,
    })
    .onConflictDoUpdate({
      target: projectDeadlines.projectId,
      set: {
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        comment: comment ?? null,
      },
    });

  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, id));

  const [row] = await db
    .select()
    .from(projectDeadlines)
    .where(eq(projectDeadlines.projectId, id))
    .limit(1);

  return Response.json({ deadline: row });
}
