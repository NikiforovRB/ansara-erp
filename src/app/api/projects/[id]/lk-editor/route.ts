import { requireUser } from "@/lib/auth";
import { getProjectLkEditorData } from "@/lib/project-queries";
import { tryPublicObjectUrl } from "@/lib/s3";

type Ctx = { params: Promise<{ id: string }> };

function weakEtag(projectId: string, updatedAt: Date | string) {
  const t =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : new Date(updatedAt).getTime();
  return `W/"lk-${projectId}-${t}"`;
}

export async function GET(req: Request, ctx: Ctx) {
  await requireUser();
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const timelineLimitRaw = Number(searchParams.get("timelineLimit") ?? "");
  const timelineOffsetRaw = Number(searchParams.get("timelineOffset") ?? "");
  const timelineLimit =
    Number.isFinite(timelineLimitRaw) && timelineLimitRaw > 0
      ? Math.min(100, Math.trunc(timelineLimitRaw))
      : 10;
  const timelineOffset =
    Number.isFinite(timelineOffsetRaw) && timelineOffsetRaw >= 0
      ? Math.trunc(timelineOffsetRaw)
      : 0;

  const full = await getProjectLkEditorData(id, {
    timelineLimit,
    timelineOffset,
  });
  if (!full) return Response.json({ error: "Не найдено" }, { status: 404 });

  const etag = weakEtag(full.project.id, full.project.updatedAt);
  const inm = req.headers.get("if-none-match");
  if (inm && inm === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": "private, no-cache" },
    });
  }

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
      timelineOffset + (full.timeline.entries?.length ?? 0) < full.timeline.total,
  };

  return Response.json(payload, {
    headers: {
      ETag: etag,
      "Cache-Control": "private, no-cache",
    },
  });
}
