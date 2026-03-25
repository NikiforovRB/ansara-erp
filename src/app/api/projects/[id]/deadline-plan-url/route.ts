import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { presignedPut, publicObjectUrl } from "@/lib/s3";

type Ctx = { params: Promise<{ id: string }> };

const postSchema = z.object({
  mime: z.string().min(1),
});

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, ctx: Ctx) {
  await requireUser();
  const { id: projectId } = await ctx.params;
  const [p] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!p) return Response.json({ error: "Не найдено" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  }

  const mime = parsed.data.mime || "application/octet-stream";
  if (!mime.startsWith("image/")) {
    return Response.json({ error: "Нужно изображение" }, { status: 400 });
  }

  let ext = ".bin";
  if (mime.includes("jpeg") || mime.includes("jpg")) ext = ".jpg";
  else if (mime.includes("png")) ext = ".png";
  else if (mime.includes("webp")) ext = ".webp";
  else if (mime.includes("gif")) ext = ".gif";

  const uid = randomUUID();
  const originalKey = `projects/${projectId}/deadline-plan/${uid}_orig${ext}`;
  const webpKey = `projects/${projectId}/deadline-plan/${uid}_p.webp`;

  const uploadUrl = await presignedPut(originalKey, mime);
  const originalUrl = publicObjectUrl(originalKey);

  return Response.json({
    originalKey,
    webpKey,
    uploadUrl,
    originalUrl,
  });
}

