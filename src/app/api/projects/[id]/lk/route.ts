import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db, ensureTimelineDescriptionAndStagesComment } from "@/lib/db";
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
  lkShowBacklog: z.boolean(),
  lkShowDeadline: z.boolean().optional().default(true),
  lkShowPayments: z.boolean().optional().default(true),
  deadline: z.object({
    startAt: z.string().datetime().optional().nullable(),
    endAt: z.string().datetime().optional().nullable(),
    comment: z.string().optional().nullable(),
  }),
  stagesComment: z.string().optional().nullable(),
  timeline: z.array(
    z.object({
      entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      title: z.string().min(1),
      description: z.string().optional().default(""),
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
            .union([
              z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
              z.literal(""),
              z.null(),
            ])
            .optional()
            .transform((v) => (v === "" || v === undefined ? null : v)),
        }),
      ),
    }),
  ),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Не авторизован" }, { status: 401 });
  }
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
    return Response.json(
      { error: "Неверные данные", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const {
    lkTitle,
    lkShowBacklog,
    lkShowDeadline,
    lkShowPayments,
    deadline,
    timeline,
    stages: stagePayload,
    stagesComment,
  } = parsed.data;

  try {
    await ensureTimelineDescriptionAndStagesComment();
    await db.transaction(async (tx) => {
      await tx
        .update(projects)
        .set({
          lkTitle,
          lkShowBacklog,
          lkShowDeadline,
          lkShowPayments,
          lkStagesComment: stagesComment ?? null,
          updatedAt: new Date(),
        })
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
        await tx.insert(timelineEntries).values({
          projectId: id,
          entryDate: row.entryDate,
          title: row.title,
          description: row.description ?? "",
          sortOrder: i,
        });

        const [entry] = await tx
          .select({ id: timelineEntries.id })
          .from(timelineEntries)
          .where(
            and(
              eq(timelineEntries.projectId, id),
              eq(timelineEntries.sortOrder, i),
            ),
          )
          .limit(1);

        if ((row.images.length || row.links.length) && !entry) {
          throw new Error(
            "Не удалось получить id записи таймлайна после сохранения",
          );
        }

        if (row.images.length && entry) {
          await tx.insert(timelineImages).values(
            row.images.map((im, j) => ({
              entryId: entry.id,
              originalKey: im.originalKey,
              webpKey: im.webpKey,
              sortOrder: j,
            })),
          );
        }
        if (row.links.length && entry) {
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

      const existingStageIds = await tx
        .select({ id: stages.id })
        .from(stages)
        .where(eq(stages.projectId, id));
      const stageIdList = existingStageIds.map((r) => r.id);
      if (stageIdList.length) {
        await tx
          .delete(stageTasks)
          .where(inArray(stageTasks.stageId, stageIdList));
      }
      await tx.delete(stages).where(eq(stages.projectId, id));

      for (let si = 0; si < stagePayload.length; si++) {
        const st = stagePayload[si];
        await tx.insert(stages).values({
          projectId: id,
          title: st.title,
          sortOrder: si,
        });

        const [stageRow] = await tx
          .select({ id: stages.id })
          .from(stages)
          .where(
            and(eq(stages.projectId, id), eq(stages.sortOrder, si)),
          )
          .limit(1);

        if (st.tasks.length && !stageRow) {
          throw new Error("Не удалось получить id этапа после сохранения");
        }

        if (st.tasks.length && stageRow) {
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[PUT /api/projects/[id]/lk]", e);
    return Response.json({ error: "Ошибка сохранения ЛК", detail: message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
