import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const patchSchema = z.object({
  login: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().max(128).optional(),
  role: z.enum(["admin", "employee"]).optional(),
  isActive: z.boolean().optional(),
});

const selfEmployeeSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().max(128).optional(),
  })
  .strict();

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const me = await requireUser();
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);

  if (me.id === id) {
    if (me.role === "employee") {
      const parsed = selfEmployeeSchema.safeParse(json);
      if (!parsed.success) {
        return Response.json({ error: "Неверные данные" }, { status: 400 });
      }
      const data = parsed.data;
      const patch: Record<string, unknown> = {};
      if (data.firstName !== undefined) patch.firstName = data.firstName;
      if (data.lastName !== undefined) patch.lastName = data.lastName;
      if (Object.keys(patch).length === 0) {
        return Response.json({ error: "Пусто" }, { status: 400 });
      }
      return applyUserPatch(id, patch);
    }

    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "Неверные данные" }, { status: 400 });
    }
    const data = parsed.data;
    if (
      data.role !== undefined &&
      data.role !== me.role
    ) {
      return Response.json({ error: "Нельзя сменить свою роль" }, { status: 400 });
    }
    if (data.isActive !== undefined && data.isActive === false) {
      return Response.json({ error: "Нельзя деактивировать себя" }, { status: 400 });
    }
    const patch: Record<string, unknown> = {};
    if (data.login !== undefined) patch.login = data.login;
    if (data.firstName !== undefined) patch.firstName = data.firstName;
    if (data.lastName !== undefined) patch.lastName = data.lastName;
    if (data.role !== undefined) patch.role = data.role;
    if (data.isActive !== undefined) patch.isActive = data.isActive;
    if (data.password !== undefined) {
      patch.passwordHash = await bcrypt.hash(data.password, 10);
    }
    if (Object.keys(patch).length === 0) {
      return Response.json({ error: "Пусто" }, { status: 400 });
    }
    return applyUserPatch(id, patch);
  }

  await requireAdmin();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  }
  const data = parsed.data;

  const patch: Record<string, unknown> = {};
  if (data.login !== undefined) patch.login = data.login;
  if (data.firstName !== undefined) patch.firstName = data.firstName;
  if (data.lastName !== undefined) patch.lastName = data.lastName;
  if (data.role !== undefined) patch.role = data.role;
  if (data.isActive !== undefined) patch.isActive = data.isActive;
  if (data.password !== undefined) {
    patch.passwordHash = await bcrypt.hash(data.password, 10);
  }
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Пусто" }, { status: 400 });
  }
  return applyUserPatch(id, patch);
}

async function applyUserPatch(id: string, patch: Record<string, unknown>) {
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
        isActive: users.isActive,
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
