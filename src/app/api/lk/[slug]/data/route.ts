import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getLkSessionOptions, type LkPinSession } from "@/lib/lk-session";
import { getProjectBySlug, getProjectFull } from "@/lib/project-queries";
import { tryPublicObjectUrl } from "@/lib/s3";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const project = await getProjectBySlug(slug);
  if (!project) {
    return Response.json({ error: "Не найдено" }, { status: 404 });
  }

  const staff = await getCurrentUser();
  const build = async () => {
    const full = await getProjectFull(project.id);
    if (!full) return null;
    const images = full.timeline.images.map((im) => ({
      ...im,
      webpUrl: tryPublicObjectUrl(im.webpKey),
      originalUrl: tryPublicObjectUrl(im.originalKey),
    }));
    return { ...full, timeline: { ...full.timeline, images } };
  };

  if (staff) {
    const full = await build();
    if (!full) {
      return Response.json({ error: "Не найдено" }, { status: 404 });
    }
    return Response.json({
      access: "staff",
      slug: project.slug,
      full,
    });
  }

  const session = await getIronSession<LkPinSession>(
    await cookies(),
    getLkSessionOptions(slug),
  );
  if (!session.verified) {
    return Response.json({ error: "Требуется PIN" }, { status: 401 });
  }

  const full = await build();
  if (!full) {
    return Response.json({ error: "Не найдено" }, { status: 404 });
  }
  const { pinView, ...projectSafe } = full.project;
  void pinView;
  return Response.json({
    access: "guest",
    slug: project.slug,
    full: { ...full, project: projectSafe },
  });
}
