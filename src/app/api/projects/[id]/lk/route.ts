import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  projectDeadlines,
  projects,
  stageTasks,
  stages,
  timelineEntries,
  timelineImages,
  timelineLinks,
} from "@/lib/db/schema";

const putSchema = z.object({
  lkTitle: z.string().min(1),
  deadline: z.object({
    startAt: z.string().datetime().optional().nullable(),
    endAt: z.string().datetime().optional().nullable(),
    comment: z.string().optional().nullable(),
  }),
  timeline: z.array(
    z.object({
      entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      title: z.string().min(1),
      images: z.array(
        z.object({
          originalKey: z.string().min(1),
          webpKey: z.string().min(1),
        }),
      ),
      links: z.array(
        z.object({
          url: z.string().min(1),
          title: z.string().min(1),
        }),
      ),
    }),
  ),
  stages: z.array(
    z.object({
      title: z.string().min(1),
      tasks: z.array(
        z.object({
          description: z.string().min(1),
          done: z.boolean(),
          completedAt: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .nullable(),
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

  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  }

  const { lkTitle, deadline, timeline, stages: stagePayload } = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(projects)
      .set({ lkTitle, updatedAt: new Date() })
      .where(eq(projects.id, id));

    await tx
      .insert(projectDeadlines)
      .values({
        projectId: id,
        startAt: deadline.startAt ? new Date(deadline.startAt) : null,
        endAt: deadline.endAt ? new Date(deadline.endAt) : null,
        comment: deadline.comment ?? null,
      })
      .onConflictDoUpdate({
        target: projectDeadlines.projectId,
        set: {
          startAt: deadline.startAt ? new Date(deadline.startAt) : null,
          endAt: deadline.endAt ? new Date(deadline.endAt) : null,
          comment: deadline.comment ?? null,
        },
      });

    await tx.delete(timelineEntries).where(eq(timelineEntries.projectId, id));

    for (let i = 0; i < timeline.length; i++) {
      const row = timeline[i];
      const [entry] = await tx
        .insert(timelineEntries)
        .values({
          projectId: id,
          entryDate: row.entryDate,
          title: row.title,
          sortOrder: i,
        })
        .returning();

      if (row.images.length) {
        await tx.insert(timelineImages).values(
          row.images.map((im, j) => ({
            entryId: entry.id,
            originalKey: im.originalKey,
            webpKey: im.webpKey,
            sortOrder: j,
          })),
        );
      }
      if (row.links.length) {
        await tx.insert(timelineLinks).values(
          row.links.map((ln, j) => ({
            entryId: entry.id,
            url: ln.url,
            linkTitle: ln.title,
            sortOrder: j,
          })),
        );
      }
    }

    await tx.delete(stages).where(eq(stages.projectId, id));

    for (let si = 0; si < stagePayload.length; si++) {
      const st = stagePayload[si];
      const [stageRow] = await tx
        .insert(stages)
        .values({
          projectId: id,
          title: st.title,
          sortOrder: si,
        })
        .returning();

      if (st.tasks.length) {
        await tx.insert(stageTasks).values(
          st.tasks.map((t, ti) => ({
            stageId: stageRow.id,
            description: t.description,
            done: t.done,
            completedAt: t.completedAt ?? null,
            sortOrder: ti,
          })),
        );
      }
    }
  });

  return Response.json({ ok: true });
}
