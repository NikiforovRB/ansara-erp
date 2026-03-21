import { publicObjectUrl } from "@/lib/s3";

export function userAvatarUrl(avatarKey: string | null | undefined) {
  if (!avatarKey) return null;
  try {
    return publicObjectUrl(avatarKey);
  } catch {
    return null;
  }
}
