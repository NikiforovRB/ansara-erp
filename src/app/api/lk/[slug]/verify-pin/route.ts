import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { z } from "zod";
import { getLkSessionOptions, type LkPinSession } from "@/lib/lk-session";
import { getProjectBySlug } from "@/lib/project-queries";

const bodySchema = z.object({
  pin: z.string().regex(/^\d{4}$/),
});

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return Response.json({ error: "Не найдено" }, { status: 404 });
  }
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверный PIN" }, { status: 400 });
  }
  if (parsed.data.pin !== project.pinView) {
    return Response.json({ error: "Неверный PIN" }, { status: 401 });
  }
  const session = await getIronSession<LkPinSession>(
    await cookies(),
    getLkSessionOptions(slug),
  );
  session.verified = true;
  await session.save();
  return Response.json({ ok: true });
}
