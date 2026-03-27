import { eq, inArray } from "drizzle-orm";
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

const timelineSchema = z.array(
  z.object({
    id: z.string().optional(),
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
);

const stagesSchema = z.array(
  z.object({
    id: z.string().optional(),
    title: z.string().min(1),
    tasks: z.array(
      z.object({
        id: z.string().optional(),
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
);

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
  timeline: timelineSchema.optional(),
  stages: stagesSchema.optional(),
  timelineDelta: z
    .object({
      deletes: z.array(z.string()).default([]),
      upserts: timelineSchema.default([]),
    })
    .optional(),
  stagesDelta: z
    .object({
      deletes: z.array(z.string()).default([]),
      upserts: z.array(
        z.object({
          id: z.string().optional(),
          title: z.string().min(1),
          sortOrder: z.number().int().min(0),
          taskDeletes: z.array(z.string()).default([]),
          taskUpserts: z.array(
            z.object({
              id: z.string().optional(),
              description: z.string().min(1),
              done: z.boolean(),
              completedAt: z
                .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()])
                .optional()
                .transform((v) => (v === "" || v === undefined ? null : v)),
              sortOrder: z.number().int().min(0),
            }),
          ),
        }),
      ),
    })
    .optional(),
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
    timelineDelta,
    stagesDelta,
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

      if (timelineDelta) {
        const existingEntries = await tx
          .select({
            id: timelineEntries.id,
            entryDate: timelineEntries.entryDate,
            title: timelineEntries.title,
            description: timelineEntries.description,
          })
          .from(timelineEntries)
          .where(eq(timelineEntries.projectId, id));
        const existingEntryIds = new Set(existingEntries.map((r) => r.id));
        const safeDeleteIds = timelineDelta.deletes.filter((x) => existingEntryIds.has(x));
        if (safeDeleteIds.length) {
          await tx.delete(timelineEntries).where(inArray(timelineEntries.id, safeDeleteIds));
        }
        for (const row of timelineDelta.upserts) {
          const incomingId = row.id && existingEntryIds.has(row.id) ? row.id : null;
          let entryId = incomingId;
          if (incomingId) {
            await tx
              .update(timelineEntries)
              .set({
                entryDate: row.entryDate,
                title: row.title,
                description: row.description ?? "",
              })
              .where(eq(timelineEntries.id, incomingId));
          } else {
            const [inserted] = await tx
              .insert(timelineEntries)
              .values({
                projectId: id,
                entryDate: row.entryDate,
                title: row.title,
                description: row.description ?? "",
                sortOrder: 0,
              })
              .returning({ id: timelineEntries.id });
            entryId = inserted?.id ?? null;
          }
          if (entryId) {
            await tx.delete(timelineImages).where(eq(timelineImages.entryId, entryId));
            await tx.delete(timelineLinks).where(eq(timelineLinks.entryId, entryId));
            if (row.images.length) {
              await tx.insert(timelineImages).values(
                row.images.map((im, j) => ({
                  entryId,
                  originalKey: im.originalKey,
                  webpKey: im.webpKey,
                  sortOrder: j,
                })),
              );
            }
            if (row.links.length) {
              await tx.insert(timelineLinks).values(
                row.links.map((ln, j) => ({
                  entryId,
                  url: ln.url,
                  linkTitle: ln.title,
                  sortOrder: j,
                })),
              );
            }
          }
        }
      } else if (timeline) {
        const existingEntries = await tx
          .select({
            id: timelineEntries.id,
            entryDate: timelineEntries.entryDate,
            title: timelineEntries.title,
            description: timelineEntries.description,
            sortOrder: timelineEntries.sortOrder,
          })
          .from(timelineEntries)
          .where(eq(timelineEntries.projectId, id));
        const existingEntryIdList = existingEntries.map((r) => r.id);
        const existingImages = existingEntryIdList.length
          ? await tx
              .select({
                entryId: timelineImages.entryId,
                originalKey: timelineImages.originalKey,
                webpKey: timelineImages.webpKey,
                sortOrder: timelineImages.sortOrder,
              })
              .from(timelineImages)
              .where(inArray(timelineImages.entryId, existingEntryIdList))
          : [];
        const existingLinks = existingEntryIdList.length
          ? await tx
              .select({
                entryId: timelineLinks.entryId,
                url: timelineLinks.url,
                linkTitle: timelineLinks.linkTitle,
                sortOrder: timelineLinks.sortOrder,
              })
              .from(timelineLinks)
              .where(inArray(timelineLinks.entryId, existingEntryIdList))
          : [];
        const imagesByEntry = new Map<string, typeof existingImages>();
        for (const im of existingImages) {
          if (!imagesByEntry.has(im.entryId)) imagesByEntry.set(im.entryId, []);
          imagesByEntry.get(im.entryId)!.push(im);
        }
        for (const arr of imagesByEntry.values()) {
          arr.sort((a, b) => a.sortOrder - b.sortOrder);
        }
        const linksByEntry = new Map<string, typeof existingLinks>();
        for (const ln of existingLinks) {
          if (!linksByEntry.has(ln.entryId)) linksByEntry.set(ln.entryId, []);
          linksByEntry.get(ln.entryId)!.push(ln);
        }
        for (const arr of linksByEntry.values()) {
          arr.sort((a, b) => a.sortOrder - b.sortOrder);
        }
        const existingEntryById = new Map(existingEntries.map((r) => [r.id, r]));
        const existingEntryIds = new Set(existingEntries.map((r) => r.id));
        const incomingKnownEntryIds = new Set(
          timeline
            .map((r) => (r.id && existingEntryIds.has(r.id) ? r.id : null))
            .filter((x): x is string => Boolean(x)),
        );
        const toDeleteEntryIds = existingEntries
          .map((r) => r.id)
          .filter((entryId) => !incomingKnownEntryIds.has(entryId));
        if (toDeleteEntryIds.length) {
          await tx.delete(timelineEntries).where(inArray(timelineEntries.id, toDeleteEntryIds));
        }

        for (let i = 0; i < timeline.length; i++) {
          const row = timeline[i];
          const incomingId = row.id && existingEntryIds.has(row.id) ? row.id : null;
          let entryId = incomingId;

          if (incomingId) {
            const prev = existingEntryById.get(incomingId);
            if (
              !prev ||
              String(prev.entryDate).slice(0, 10) !== row.entryDate ||
              prev.title !== row.title ||
              (prev.description ?? "") !== (row.description ?? "") ||
              prev.sortOrder !== i
            ) {
              await tx
                .update(timelineEntries)
                .set({
                  entryDate: row.entryDate,
                  title: row.title,
                  description: row.description ?? "",
                  sortOrder: i,
                })
                .where(eq(timelineEntries.id, incomingId));
            }
          } else {
            const [inserted] = await tx
              .insert(timelineEntries)
              .values({
                projectId: id,
                entryDate: row.entryDate,
                title: row.title,
                description: row.description ?? "",
                sortOrder: i,
              })
              .returning({ id: timelineEntries.id });
            entryId = inserted?.id ?? null;
          }

          if ((row.images.length || row.links.length) && !entryId) {
            throw new Error("Не удалось получить id записи таймлайна после сохранения");
          }

          if (entryId) {
            const prevImages = imagesByEntry.get(entryId) ?? [];
            const sameImages =
              prevImages.length === row.images.length &&
              prevImages.every(
                (x, idx) =>
                  x.originalKey === row.images[idx]?.originalKey &&
                  x.webpKey === row.images[idx]?.webpKey &&
                  x.sortOrder === idx,
              );
            if (!sameImages) {
              await tx.delete(timelineImages).where(eq(timelineImages.entryId, entryId));
              if (row.images.length) {
                await tx.insert(timelineImages).values(
                  row.images.map((im, j) => ({
                    entryId,
                    originalKey: im.originalKey,
                    webpKey: im.webpKey,
                    sortOrder: j,
                  })),
                );
              }
            }

            const prevLinks = linksByEntry.get(entryId) ?? [];
            const sameLinks =
              prevLinks.length === row.links.length &&
              prevLinks.every(
                (x, idx) =>
                  x.url === row.links[idx]?.url &&
                  x.linkTitle === row.links[idx]?.title &&
                  x.sortOrder === idx,
              );
            if (!sameLinks) {
              await tx.delete(timelineLinks).where(eq(timelineLinks.entryId, entryId));
              if (row.links.length) {
                await tx.insert(timelineLinks).values(
                  row.links.map((ln, j) => ({
                    entryId,
                    url: ln.url,
                    linkTitle: ln.title,
                    sortOrder: j,
                  })),
                );
              }
            }
          }
        }
      }

      if (stagesDelta) {
        const existingStages = await tx
          .select({ id: stages.id })
          .from(stages)
          .where(eq(stages.projectId, id));
        const existingStageIds = new Set(existingStages.map((r) => r.id));
        const safeStageDeleteIds = stagesDelta.deletes.filter((x) => existingStageIds.has(x));
        if (safeStageDeleteIds.length) {
          await tx.delete(stages).where(inArray(stages.id, safeStageDeleteIds));
        }

        for (const st of stagesDelta.upserts) {
          const incomingStageId = st.id && existingStageIds.has(st.id) ? st.id : null;
          let stageId = incomingStageId;
          if (incomingStageId) {
            await tx
              .update(stages)
              .set({ title: st.title, sortOrder: st.sortOrder })
              .where(eq(stages.id, incomingStageId));
          } else {
            const [inserted] = await tx
              .insert(stages)
              .values({ projectId: id, title: st.title, sortOrder: st.sortOrder })
              .returning({ id: stages.id });
            stageId = inserted?.id ?? null;
          }
          if (!stageId) continue;
          const existingTasksForStage = await tx
            .select({ id: stageTasks.id })
            .from(stageTasks)
            .where(eq(stageTasks.stageId, stageId));
          const existingTaskIds = new Set(existingTasksForStage.map((r) => r.id));
          const safeTaskDeleteIds = st.taskDeletes.filter((x) => existingTaskIds.has(x));
          if (safeTaskDeleteIds.length) {
            await tx.delete(stageTasks).where(inArray(stageTasks.id, safeTaskDeleteIds));
          }
          for (const task of st.taskUpserts) {
            const incomingTaskId = task.id && existingTaskIds.has(task.id) ? task.id : null;
            if (incomingTaskId) {
              await tx
                .update(stageTasks)
                .set({
                  description: task.description,
                  done: task.done,
                  completedAt: task.completedAt ?? null,
                  sortOrder: task.sortOrder,
                })
                .where(eq(stageTasks.id, incomingTaskId));
            } else {
              await tx.insert(stageTasks).values({
                stageId,
                description: task.description,
                done: task.done,
                completedAt: task.completedAt ?? null,
                sortOrder: task.sortOrder,
              });
            }
          }
        }
      } else if (stagePayload) {
        const existingStages = await tx
          .select({ id: stages.id, title: stages.title, sortOrder: stages.sortOrder })
          .from(stages)
          .where(eq(stages.projectId, id));
        const existingStageRowsById = new Map(existingStages.map((s) => [s.id, s]));
        const existingStageIdList = existingStages.map((s) => s.id);
        const existingTasksRows = existingStageIdList.length
          ? await tx
              .select({
                id: stageTasks.id,
                stageId: stageTasks.stageId,
                description: stageTasks.description,
                done: stageTasks.done,
                completedAt: stageTasks.completedAt,
                sortOrder: stageTasks.sortOrder,
              })
              .from(stageTasks)
              .where(inArray(stageTasks.stageId, existingStageIdList))
          : [];
        const existingTasksByStage = new Map<string, typeof existingTasksRows>();
        for (const t of existingTasksRows) {
          if (!existingTasksByStage.has(t.stageId)) existingTasksByStage.set(t.stageId, []);
          existingTasksByStage.get(t.stageId)!.push(t);
        }
        for (const arr of existingTasksByStage.values()) arr.sort((a, b) => a.sortOrder - b.sortOrder);
        const existingStageIds = new Set(existingStages.map((r) => r.id));
        const incomingKnownStageIds = new Set(
          stagePayload
            .map((s) => (s.id && existingStageIds.has(s.id) ? s.id : null))
            .filter((x): x is string => Boolean(x)),
        );
        const toDeleteStageIds = existingStages
          .map((s) => s.id)
          .filter((stageId) => !incomingKnownStageIds.has(stageId));
        if (toDeleteStageIds.length) {
          await tx.delete(stages).where(inArray(stages.id, toDeleteStageIds));
        }

        for (let si = 0; si < stagePayload.length; si++) {
          const st = stagePayload[si];
          const incomingStageId = st.id && existingStageIds.has(st.id) ? st.id : null;
          let stageId = incomingStageId;

          if (incomingStageId) {
            const prevStage = existingStageRowsById.get(incomingStageId);
            if (!prevStage || prevStage.title !== st.title || prevStage.sortOrder !== si) {
              await tx
                .update(stages)
                .set({
                  title: st.title,
                  sortOrder: si,
                })
                .where(eq(stages.id, incomingStageId));
            }
          } else {
            const [inserted] = await tx
              .insert(stages)
              .values({
                projectId: id,
                title: st.title,
                sortOrder: si,
              })
              .returning({ id: stages.id });
            stageId = inserted?.id ?? null;
          }

          if (!stageId) throw new Error("Не удалось получить id этапа после сохранения");

          const existingTasksForStage = await tx
            .select({
              id: stageTasks.id,
              description: stageTasks.description,
              done: stageTasks.done,
              completedAt: stageTasks.completedAt,
              sortOrder: stageTasks.sortOrder,
            })
            .from(stageTasks)
            .where(eq(stageTasks.stageId, stageId));
          const existingTaskIds = new Set(existingTasksForStage.map((r) => r.id));
          const incomingKnownTaskIds = new Set(
            st.tasks
              .map((t) => (t.id && existingTaskIds.has(t.id) ? t.id : null))
              .filter((x): x is string => Boolean(x)),
          );
          const toDeleteTaskIds = existingTasksForStage
            .map((t) => t.id)
            .filter((taskId) => !incomingKnownTaskIds.has(taskId));
          if (toDeleteTaskIds.length) {
            await tx.delete(stageTasks).where(inArray(stageTasks.id, toDeleteTaskIds));
          }

          for (let ti = 0; ti < st.tasks.length; ti++) {
            const task = st.tasks[ti];
            const incomingTaskId = task.id && existingTaskIds.has(task.id) ? task.id : null;
            if (incomingTaskId) {
              const prev = existingTasksForStage.find((x) => x.id === incomingTaskId);
              if (
                !prev ||
                prev.description !== task.description ||
                prev.done !== task.done ||
                (prev.completedAt ? String(prev.completedAt).slice(0, 10) : null) !==
                  (task.completedAt ?? null) ||
                prev.sortOrder !== ti
              ) {
                await tx
                  .update(stageTasks)
                  .set({
                    description: task.description,
                    done: task.done,
                    completedAt: task.completedAt ?? null,
                    sortOrder: ti,
                  })
                  .where(eq(stageTasks.id, incomingTaskId));
              }
            } else {
              await tx.insert(stageTasks).values({
                stageId,
                description: task.description,
                done: task.done,
                completedAt: task.completedAt ?? null,
                sortOrder: ti,
              });
            }
          }
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
