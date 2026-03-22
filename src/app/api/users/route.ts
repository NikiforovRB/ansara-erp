import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { tryPublicObjectUrl } from "@/lib/s3";

export async function GET() {
  await requireUser();
  const rows = await db
    .select({
      id: users.id,
      login: users.login,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      avatarKey: users.avatarKey,
    })
    .from(users)
    .orderBy(users.lastName, users.firstName);
  return Response.json({
    users: rows.map((u) => ({
      ...u,
      avatarUrl: tryPublicObjectUrl(u.avatarKey),
    })),
  });
}

const createSchema = z.object({
  login: z.string().min(2),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().max(128).optional().default(""),
  role: z.enum(["admin", "employee"]),
});

export async function POST(req: Request) {
  await requireAdmin();
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    const [row] = await db
      .insert(users)
      .values({
        login: parsed.data.login,
        passwordHash,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        role: parsed.data.role,
      })
      .returning({
        id: users.id,
        login: users.login,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        avatarKey: users.avatarKey,
      });
    return Response.json({ user: row });
  } catch {
    return Response.json({ error: "Логин занят" }, { status: 409 });
  }
}
