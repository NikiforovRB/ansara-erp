import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { tryPublicObjectUrl } from "@/lib/s3";

export async function GET(req: Request) {
  const me = await requireUser();
  const { searchParams } = new URL(req.url);
  const includeAll = searchParams.get("all") === "1" && me.role === "admin";
  const base = db
    .select({
      id: users.id,
      login: users.login,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      avatarKey: users.avatarKey,
    })
    .from(users);
  const rows = includeAll
    ? await base.orderBy(users.lastName, users.firstName)
    : await base.where(eq(users.isActive, true)).orderBy(users.lastName, users.firstName);
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
  isActive: z.boolean().optional().default(true),
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
        isActive: parsed.data.isActive,
      })
      .returning({
        id: users.id,
        login: users.login,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        avatarKey: users.avatarKey,
      });
    return Response.json({ user: row });
  } catch {
    return Response.json({ error: "Логин занят" }, { status: 409 });
  }
}
