import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

let client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION ?? "us-east-1",
      endpoint: requireEnv("S3_ENDPOINT"),
      credentials: {
        accessKeyId: requireEnv("S3_ACCESS_KEY"),
        secretAccessKey: requireEnv("S3_SECRET_KEY"),
      },
      forcePathStyle: true,
    });
  }
  return client;
}

export function getBucket(): string {
  return requireEnv("S3_BUCKET");
}

/** Public URL for browser (GET). Set S3_PUBLIC_BASE_URL to path-style base, e.g. https://s3.twcstorage.ru/bucket */
export function publicObjectUrl(key: string): string {
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (base) {
    return `${base}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  }
  const endpoint = requireEnv("S3_ENDPOINT").replace(/\/$/, "");
  const bucket = getBucket();
  return `${endpoint}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function tryPublicObjectUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  try {
    return publicObjectUrl(key);
  } catch {
    return null;
  }
}

export async function presignedPut(
  key: string,
  contentType: string,
  expiresIn = 3600,
) {
  const cmd = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getS3Client(), cmd, { expiresIn });
}

export async function deleteObjectKey(key: string) {
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );
}
