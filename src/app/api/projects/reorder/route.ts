import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";

const bodySchema = z.object({
  status: z.enum(["active", "paused", "completed"]),
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function PATCH(req: Request) {
  await requireUser();
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  }
  const { status, orderedIds } = parsed.data;

  if (new Set(orderedIds).size !== orderedIds.length) {
    return Response.json({ error: "Повтор id" }, { status: 400 });
  }

  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(eq(projects.status, status), inArray(projects.id, orderedIds)),
    );

  if (rows.length !== orderedIds.length) {
    return Response.json({ error: "Проекты не найдены" }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(projects)
        .set({ dashboardSortOrder: i })
        .where(and(eq(projects.id, orderedIds[i]), eq(projects.status, status)));
    }
  });

  return Response.json({ ok: true });
}
