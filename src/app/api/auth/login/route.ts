import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { formatDbError } from "@/lib/pg-error";
import { getSessionOptions, type StaffSession } from "@/lib/session";

const bodySchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "Неверные данные" }, { status: 400 });
    }
    const { login, password } = parsed.data;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.login, login))
      .limit(1);
    if (user && user.isActive === false) {
      return Response.json(
        {
          error:
            "Ваша учётная запись стала неактивной. Все вопросы к Родиону.",
        },
        { status: 403 },
      );
    }
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return Response.json(
        { error: "Неверный логин или пароль" },
        { status: 401 },
      );
    }
    const session = await getIronSession<StaffSession>(
      await cookies(),
      getSessionOptions(),
    );
    session.userId = user.id;
    session.isLoggedIn = true;
    await session.save();
    return Response.json({
      user: {
        id: user.id,
        login: user.login,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarKey: user.avatarKey,
      },
    });
  } catch (e) {
    const parts: string[] = [];
    if (e instanceof AggregateError && Array.isArray(e.errors)) {
      for (const err of e.errors) {
        parts.push(formatDbError(err));
      }
    }
    const formatted = formatDbError(e);
    const combined = [formatted, ...parts].filter(Boolean).join(" | ");
    const isDb =
      /connect|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNRESET|password authentication|SSL|postgres|query failed|timeout|refused|getaddrinfo|SASL|certificate|self-signed|Tenant|not found|database/i.test(
        combined,
      );
    console.error("[auth/login]", combined, e);
    const isDev = process.env.NODE_ENV === "development";
    return Response.json(
      {
        error: isDb
          ? "Нет связи с базой данных. Проверьте .env (POSTGRESQL_*) и доступ с вашей сети."
          : "Ошибка сервера при входе",
        ...(isDev ? { details: combined.slice(0, 500) } : {}),
      },
      { status: isDb ? 503 : 500 },
    );
  }
}
