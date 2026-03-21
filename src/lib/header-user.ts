import type { HeaderUser } from "@/components/app-header";
import { tryPublicObjectUrl } from "@/lib/s3";

type DbUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: "admin" | "employee";
  avatarKey: string | null;
};

export function toHeaderUser(user: DbUser): HeaderUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatarUrl: tryPublicObjectUrl(user.avatarKey),
  };
}
