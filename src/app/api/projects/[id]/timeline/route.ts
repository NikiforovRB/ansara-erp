import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { timelineEntries, timelineImages, timelineLinks } from "@/lib/db/schema";
import { tryPublicObjectUrl } from "@/lib/s3";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  await requireUser();
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const limitRaw = Number(searchParams.get("limit") ?? "10");
  const offsetRaw = Number(searchParams.get("offset") ?? "0");
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(100, Math.trunc(limitRaw)) : 10;
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.trunc(offsetRaw) : 0;

  const entries = await db
    .select()
    .from(timelineEntries)
    .where(eq(timelineEntries.projectId, id))
    .orderBy(desc(timelineEntries.entryDate), asc(timelineEntries.sortOrder))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(timelineEntries)
    .where(eq(timelineEntries.projectId, id));

  const entryIds = entries.map((e) => e.id);
  const images = entryIds.length
    ? await db
        .select()
        .from(timelineImages)
        .where(inArray(timelineImages.entryId, entryIds))
        .orderBy(asc(timelineImages.sortOrder))
    : [];
  const links = entryIds.length
    ? await db
        .select()
        .from(timelineLinks)
        .where(inArray(timelineLinks.entryId, entryIds))
        .orderBy(asc(timelineLinks.sortOrder))
    : [];

  return Response.json(
    {
      entries,
      images: images.map((im) => ({
        ...im,
        webpUrl: tryPublicObjectUrl(im.webpKey),
        originalUrl: tryPublicObjectUrl(im.originalKey),
      })),
      links,
      total: countRow?.count ?? 0,
      hasMore: offset + entries.length < (countRow?.count ?? 0),
    },
    {
      headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" },
    },
  );
}
