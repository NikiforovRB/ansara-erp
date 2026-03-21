import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getProjectFull } from "@/lib/project-queries";
import { tryPublicObjectUrl } from "@/lib/s3";

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
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  await requireUser();
  const { id } = await ctx.params;
  const full = await getProjectFull(id);
  if (!full) return Response.json({ error: "Не найдено" }, { status: 404 });
  const images = full.timeline.images.map((im) => ({
    ...im,
    webpUrl: tryPublicObjectUrl(im.webpKey),
    originalUrl: tryPublicObjectUrl(im.originalKey),
  }));
  return Response.json({
    ...full,
    timeline: { ...full.timeline, images },
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
  const deleted = await db.delete(projects).where(eq(projects.id, id)).returning();
  if (!deleted.length) return Response.json({ error: "Не найдено" }, { status: 404 });
  return Response.json({ ok: true });
}
