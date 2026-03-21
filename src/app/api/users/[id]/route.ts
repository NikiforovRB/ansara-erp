import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const patchSchema = z.object({
  login: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(["admin", "employee"]).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  }
  const data = parsed.data;
  if (
    id === admin.id &&
    data.role !== undefined &&
    data.role !== admin.role
  ) {
    return Response.json({ error: "Нельзя сменить свою роль" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (data.login !== undefined) patch.login = data.login;
  if (data.firstName !== undefined) patch.firstName = data.firstName;
  if (data.lastName !== undefined) patch.lastName = data.lastName;
  if (data.role !== undefined) patch.role = data.role;
  if (data.password !== undefined) {
    patch.passwordHash = await bcrypt.hash(data.password, 10);
  }
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Пусто" }, { status: 400 });
  }

  try {
    const [row] = await db
      .update(users)
      .set(patch as never)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        login: users.login,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        avatarKey: users.avatarKey,
      });
    if (!row) return Response.json({ error: "Не найдено" }, { status: 404 });
    return Response.json({ user: row });
  } catch {
    return Response.json({ error: "Логин занят" }, { status: 409 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  if (id === admin.id) {
    return Response.json({ error: "Нельзя удалить себя" }, { status: 400 });
  }
  const deleted = await db.delete(users).where(eq(users.id, id)).returning();
  if (!deleted.length) {
    return Response.json({ error: "Не найдено" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
