import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { projectDeadlines, projects, timelineEntries, timelineImages } from "@/lib/db/schema";
import { getProjectFull } from "@/lib/project-queries";
import { deleteObjectKey, tryPublicObjectUrl } from "@/lib/s3";

const patchSchema = z.object({
  customerName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  pinView: z.string().regex(/^\d{4}$/).optional(),
  shortDescription: z.string().optional().nullable(),
  longDescription: z.string().optional().nullable(),
  cms: z
    .enum([
      "tilda",
      "wordpress",
      "opencart",
      "modx",
      "bitrix",
      "pure_code",
    ])
    .optional()
    .nullable(),
  status: z.enum(["active", "paused", "completed"]).optional(),
  lkTitle: z.string().min(1).optional(),
  remainingAmountRubles: z.number().int().min(0).optional(),
  groupId: z.string().uuid().optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  await requireUser();
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const timelineLimitRaw = Number(searchParams.get("timelineLimit") ?? "");
  const timelineOffsetRaw = Number(searchParams.get("timelineOffset") ?? "");
  const timelineLimit =
    Number.isFinite(timelineLimitRaw) && timelineLimitRaw > 0
      ? Math.min(100, Math.trunc(timelineLimitRaw))
      : undefined;
  const timelineOffset =
    Number.isFinite(timelineOffsetRaw) && timelineOffsetRaw >= 0
      ? Math.trunc(timelineOffsetRaw)
      : 0;
  const full = await getProjectFull(id, { timelineLimit, timelineOffset });
  if (!full) return Response.json({ error: "Не найдено" }, { status: 404 });
  const images = full.timeline.images.map((im) => ({
    ...im,
    webpUrl: tryPublicObjectUrl(im.webpKey),
    originalUrl: tryPublicObjectUrl(im.originalKey),
  }));
  const deadline = full.deadline
    ? {
        ...full.deadline,
        calendarPlanOriginalUrl: tryPublicObjectUrl(
          (full.deadline as { calendarPlanOriginalKey?: string | null })
            .calendarPlanOriginalKey,
        ),
        calendarPlanWebpUrl: tryPublicObjectUrl(
          (full.deadline as { calendarPlanWebpKey?: string | null })
            .calendarPlanWebpKey,
        ),
      }
    : null;
  const payload = {
    ...full,
    deadline,
    timeline: { ...full.timeline, images },
    timelineHasMore:
      typeof full.timeline.total === "number"
        ? timelineOffset + (full.timeline.entries?.length ?? 0) < full.timeline.total
        : false,
  };
  return Response.json(payload, {
    headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" },
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  await requireUser();
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  }
  const data = parsed.data;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  (Object.keys(data) as (keyof typeof data)[]).forEach((k) => {
    const v = data[k];
    if (v !== undefined) patch[k] = v;
  });
  if (Object.keys(patch).length === 1) {
    return Response.json({ error: "Пусто" }, { status: 400 });
  }
  const [updated] = await db
    .update(projects)
    .set(patch as typeof projects.$inferInsert)
    .where(eq(projects.id, id))
    .returning();
  if (!updated) return Response.json({ error: "Не найдено" }, { status: 404 });
  return Response.json({ project: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  await requireUser();
  const { id } = await ctx.params;
  const imageRows = await db
    .select({
      originalKey: timelineImages.originalKey,
      webpKey: timelineImages.webpKey,
    })
    .from(timelineImages)
    .innerJoin(timelineEntries, eq(timelineImages.entryId, timelineEntries.id))
    .where(eq(timelineEntries.projectId, id));

  const [deadlineRow] = await db
    .select({
      calendarPlanOriginalKey: projectDeadlines.calendarPlanOriginalKey,
      calendarPlanWebpKey: projectDeadlines.calendarPlanWebpKey,
    })
    .from(projectDeadlines)
    .where(eq(projectDeadlines.projectId, id))
    .limit(1);

  const deleted = await db.delete(projects).where(eq(projects.id, id)).returning();
  if (!deleted.length) return Response.json({ error: "Не найдено" }, { status: 404 });
  const keys = Array.from(
    new Set(imageRows.flatMap((r) => [r.originalKey, r.webpKey]).filter(Boolean)),
  );
  if (deadlineRow) {
    keys.push(
      ...[deadlineRow.calendarPlanOriginalKey, deadlineRow.calendarPlanWebpKey].filter(
        (x): x is string => Boolean(x),
      ),
    );
  }
  await Promise.allSettled(keys.map((key) => deleteObjectKey(key)));
  return Response.json({ ok: true });
}
