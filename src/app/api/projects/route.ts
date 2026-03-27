import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  projectDeadlines,
  projects,
} from "@/lib/db/schema";
import { generateProjectSlug } from "@/lib/slug";
import {
  listProjectsWithMeta,
  type ProjectStatusFilter,
} from "@/lib/project-queries";
import { tryPublicObjectUrl } from "@/lib/s3";

const statusSchema = z.enum(["active", "paused", "completed"]);

export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const status = statusSchema.safeParse(searchParams.get("status") ?? "active");
    if (!status.success) {
      return Response.json({ error: "status" }, { status: 400 });
    }
    const rows = await listProjectsWithMeta(status.data as ProjectStatusFilter);
    const countsRows = await db
      .select({
        status: projects.status,
        total: sql<number>`count(*)::int`.mapWith(Number),
      })
      .from(projects)
      .groupBy(projects.status);
    const counts = {
      active: 0,
      paused: 0,
      completed: 0,
    } as Record<ProjectStatusFilter, number>;
    for (const row of countsRows) counts[row.status] = row.total;
    const projectsOut = rows.map((r) => {
      const bp = r.backlogPreview;
      if (!bp) return r;
      if ("variant" in bp && bp.variant === "all_completed") return r;
      if ("variant" in bp && bp.variant === "active") {
        return {
          ...r,
          backlogPreview: {
            ...bp,
            assigneeAvatarUrl: tryPublicObjectUrl(bp.assignee?.avatarKey ?? null),
          },
        };
      }
      return r;
    });
    return Response.json(
      { projects: projectsOut, counts },
      { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } },
    );
  } catch (e) {
    if (e instanceof Response) throw e;
    const message = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/projects]", e);
    return Response.json(
      { error: "Не удалось загрузить проекты", detail: message },
      { status: 500 },
    );
  }
}

const createSchema = z.object({
  customerName: z.string().min(1),
  phone: z.string().optional().nullable(),
  pinView: z.string().regex(/^\d{4}$/),
  shortDescription: z.string().optional().nullable(),
  groupId: z.string().uuid().optional().nullable(),
});

export async function POST(req: Request) {
  await requireUser();
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Неверные данные" }, { status: 400 });
  }
  const { customerName, phone, pinView, shortDescription, groupId } = parsed.data;

  let slug = generateProjectSlug();
  for (let i = 0; i < 20; i++) {
    const exists = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);
    if (!exists.length) break;
    slug = generateProjectSlug();
  }

  const [agg] = await db
    .select({
      m: sql<number>`coalesce(max(${projects.dashboardSortOrder}), -1)`.mapWith(
        Number,
      ),
    })
    .from(projects)
    .where(eq(projects.status, "active"));

  const [created] = await db
    .insert(projects)
    .values({
      customerName,
      phone: phone ?? null,
      pinView,
      shortDescription: shortDescription ?? null,
      groupId: groupId ?? null,
      slug,
      status: "active",
      dashboardSortOrder: agg.m + 1,
    })
    .returning();

  await db.insert(projectDeadlines).values({
    projectId: created.id,
    startAt: null,
    endAt: null,
    comment: null,
  });

  return Response.json({ project: created });
}
