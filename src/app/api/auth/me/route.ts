import { getCurrentUser } from "@/lib/auth";
import { tryPublicObjectUrl } from "@/lib/s3";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ user: null });
  }
  return Response.json({
    user: {
      id: user.id,
      login: user.login,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarKey: user.avatarKey,
      avatarUrl: tryPublicObjectUrl(user.avatarKey),
    },
  });
}
