import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db, ensureBacklogListColumns } from "@/lib/db";
import { backlogLists, backlogTasks, projects } from "@/lib/db/schema";

const putSchema = z.object({
  lists: z.array(
    z.object({
      title: z.string().min(1),
      assigneeUserId: z.string().uuid().optional().nullable(),
      listStatus: z.enum(["not_started", "in_progress", "completed", "rejected"]),
      formedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      tasks: z.array(
        z.object({
          description: z.string().min(1),
          done: z.boolean(),
        }),
      ),
    }),
  ),
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

  await ensureBacklogListColumns();

  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    await tx.delete(backlogLists).where(eq(backlogLists.projectId, id));

    for (let i = 0; i < parsed.data.lists.length; i++) {
      const list = parsed.data.lists[i];
      const [ins] = await tx
        .insert(backlogLists)
        .values({
          projectId: id,
          title: list.title,
          assigneeUserId: list.assigneeUserId ?? null,
          listStatus: list.listStatus,
          formedAt: list.formedAt,
          sortOrder: i,
        })
        .returning();

      if (list.tasks.length) {
        await tx.insert(backlogTasks).values(
          list.tasks.map((t, j) => ({
            listId: ins.id,
            description: t.description,
            done: t.done,
            sortOrder: j,
          })),
        );
      }
    }

    await tx
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, id));
  });

  return Response.json({ ok: true });
}
