import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const putSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function PUT(req: Request) {
  await requireAdmin();
  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  }

  const orderedIds = parsed.data.orderedIds;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, orderedIds));
  const existingSet = new Set(existing.map((r) => r.id));
  const filtered = orderedIds.filter((id) => existingSet.has(id));
  if (filtered.length === 0) return Response.json({ ok: true });

  await db.transaction(async (tx) => {
    for (let i = 0; i < filtered.length; i++) {
      await tx
        .update(users)
        .set({ sortOrder: i })
        .where(eq(users.id, filtered[i]!));
    }
  });

  return Response.json({ ok: true });
}

