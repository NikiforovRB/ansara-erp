import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { projectGroups } from "@/lib/db/schema";

const bodySchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});

export async function PUT(req: Request) {
  await requireUser();
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  }
  const { orderedIds } = parsed.data;
  if (new Set(orderedIds).size !== orderedIds.length) {
    return Response.json({ error: "Повтор id" }, { status: 400 });
  }
  const rows = orderedIds.length
    ? await db
        .select({ id: projectGroups.id })
        .from(projectGroups)
        .where(inArray(projectGroups.id, orderedIds))
    : [];
  if (rows.length !== orderedIds.length) {
    return Response.json({ error: "Группы не найдены" }, { status: 400 });
  }
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(projectGroups).set({ sortOrder: i }).where(eq(projectGroups.id, orderedIds[i]));
    }
  });
  return Response.json({ ok: true });
}
