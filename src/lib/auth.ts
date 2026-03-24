import { eq } from "drizzle-orm";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionOptions, type StaffSession } from "@/lib/session";

export async function getStaffSession() {
  const c = await cookies();
  return getIronSession<StaffSession>(c, getSessionOptions());
}

export async function getCurrentUser() {
  const session = await getStaffSession();
  if (!session.isLoggedIn || !session.userId) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!user || user.isActive === false) return null;
  return user;
}

const jsonHeaders = { "Content-Type": "application/json" };

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: jsonHeaders,
    });
  }
  return user;
}
