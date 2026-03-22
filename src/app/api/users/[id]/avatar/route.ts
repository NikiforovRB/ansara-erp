import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getBucket, getS3Client, publicObjectUrl } from "@/lib/s3";

type Ctx = { params: Promise<{ id: string }> };

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request, ctx: Ctx) {
  const me = await requireUser();
  const { id } = await ctx.params;
  if (me.id !== id && me.role !== "admin") {
    return Response.json({ error: "Нет доступа" }, { status: 403 });
  }
  const [u] = await db
    .select({ id: users.id, avatarKey: users.avatarKey })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!u) return Response.json({ error: "Не найдено" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return Response.json({ error: "Файл не передан" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Файл слишком большой" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let webpBuf: Buffer;
  try {
    webpBuf = await sharp(buf)
      .rotate()
      .resize({ width: 512, height: 512, fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return Response.json({ error: "Не удалось обработать изображение" }, { status: 400 });
  }

  const key = `users/${id}/avatar_${randomUUID()}.webp`;

  try {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        Body: webpBuf,
        ContentType: "image/webp",
      }),
    );
  } catch {
    return Response.json({ error: "S3 недоступен" }, { status: 503 });
  }

  const [updated] = await db
    .update(users)
    .set({ avatarKey: key })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      avatarKey: users.avatarKey,
    });

  let avatarUrl: string | null = null;
  try {
    avatarUrl = publicObjectUrl(key);
  } catch {
    avatarUrl = null;
  }

  return Response.json({ user: updated, avatarUrl });
}
