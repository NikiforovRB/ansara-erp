import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { getBucket, getS3Client, publicObjectUrl } from "@/lib/s3";

type Ctx = { params: Promise<{ id: string }> };

const MAX_BYTES = 40 * 1024 * 1024;

export async function POST(req: Request, ctx: Ctx) {
  await requireUser();
  const { id: projectId } = await ctx.params;
  const [p] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!p) return Response.json({ error: "Не найдено" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return Response.json({ error: "Файл не передан" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Файл слишком большой" }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  if (!mime.startsWith("image/")) {
    return Response.json({ error: "Нужно изображение" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let ext = ".bin";
  if (mime.includes("jpeg") || mime.includes("jpg")) ext = ".jpg";
  else if (mime.includes("png")) ext = ".png";
  else if (mime.includes("webp")) ext = ".webp";
  else if (mime.includes("gif")) ext = ".gif";

  const uid = randomUUID();
  const originalKey = `projects/${projectId}/tl/${uid}_orig${ext}`;
  const webpKey = `projects/${projectId}/tl/${uid}_p.webp`;

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

  const client = getS3Client();
  const bucket = getBucket();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: originalKey,
      Body: buf,
      ContentType: mime,
    }),
  );
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: webpKey,
      Body: webpBuf,
      ContentType: "image/webp",
    }),
  );

  let originalUrl: string;
  let webpUrl: string;
  try {
    originalUrl = publicObjectUrl(originalKey);
    webpUrl = publicObjectUrl(webpKey);
  } catch {
    return Response.json(
      { error: "S3 не настроен (S3_PUBLIC_BASE_URL / ключи)" },
      { status: 503 },
    );
  }

  return Response.json({ originalKey, webpKey, originalUrl, webpUrl });
}
