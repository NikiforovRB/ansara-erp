import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projectGroups, projects } from "@/lib/db/schema";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().trim().min(1),
});

export async function PATCH(req: Request, ctx: Ctx) {
  await requireAdmin();
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  }
  const [updated] = await db
    .update(projectGroups)
    .set({ title: parsed.data.title })
    .where(eq(projectGroups.id, id))
    .returning();
  if (!updated) return Response.json({ error: "Не найдено" }, { status: 404 });
  return Response.json({ group: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  await requireAdmin();
  const { id } = await ctx.params;
  await db.transaction(async (tx) => {
    await tx.update(projects).set({ groupId: null }).where(eq(projects.groupId, id));
    await tx.delete(projectGroups).where(eq(projectGroups.id, id));
  });
  return Response.json({ ok: true });
}
