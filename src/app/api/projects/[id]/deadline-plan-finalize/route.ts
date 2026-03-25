import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { z } from "zod";
import sharp from "sharp";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { projectDeadlines, projects } from "@/lib/db/schema";
import { deleteObjectKey, getBucket, getS3Client, publicObjectUrl } from "@/lib/s3";

type Ctx = { params: Promise<{ id: string }> };

const postSchema = z.object({
  originalKey: z.string().min(1),
  webpKey: z.string().min(1),
});

export const runtime = "nodejs";
export const maxDuration = 300;

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body) throw new Error("empty_body");
  // @ts-expect-error - runtime provided
  if (typeof body.transformToByteArray === "function") {
    // @ts-expect-error - runtime provided
    const arr = await body.transformToByteArray();
    return Buffer.from(arr);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = body as any;
  if (typeof stream.on === "function") {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      stream.on("end", () => resolve());
      stream.on("error", (e: unknown) => reject(e));
    });
    return Buffer.concat(chunks);
  }
  throw new Error("unknown_body_type");
}

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

  const { originalKey, webpKey } = parsed.data;
  if (!originalKey.startsWith(`projects/${projectId}/`)) {
    return Response.json({ error: "Неверный ключ" }, { status: 400 });
  }
  if (!webpKey.startsWith(`projects/${projectId}/`)) {
    return Response.json({ error: "Неверный ключ" }, { status: 400 });
  }

  const client = getS3Client();
  const bucket = getBucket();

  const got = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: originalKey }),
  );
  const buf = await streamToBuffer(got.Body);

  let webpBuf: Buffer;
  try {
    webpBuf = await sharp(buf, { limitInputPixels: false })
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return Response.json({ error: "Не удалось обработать изображение" }, { status: 400 });
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: webpKey,
      Body: webpBuf,
      ContentType: "image/webp",
    }),
  );

  const [prev] = await db
    .select({
      calendarPlanOriginalKey: projectDeadlines.calendarPlanOriginalKey,
      calendarPlanWebpKey: projectDeadlines.calendarPlanWebpKey,
    })
    .from(projectDeadlines)
    .where(eq(projectDeadlines.projectId, projectId))
    .limit(1);

  await db
    .insert(projectDeadlines)
    .values({
      projectId,
      calendarPlanOriginalKey: originalKey,
      calendarPlanWebpKey: webpKey,
    })
    .onConflictDoUpdate({
      target: projectDeadlines.projectId,
      set: {
        calendarPlanOriginalKey: originalKey,
        calendarPlanWebpKey: webpKey,
      },
    });

  const oldKeys = Array.from(
    new Set(
      [prev?.calendarPlanOriginalKey, prev?.calendarPlanWebpKey].filter(
        (x): x is string => Boolean(x),
      ),
    ),
  ).filter((k) => k !== originalKey && k !== webpKey);

  await Promise.allSettled(oldKeys.map((k) => deleteObjectKey(k)));

  return Response.json({
    originalKey,
    webpKey,
    originalUrl: publicObjectUrl(originalKey),
    webpUrl: publicObjectUrl(webpKey),
  });
}

