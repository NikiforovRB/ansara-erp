import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  ensureBacklogListColumns,
  ensureDocumentsLinkTitleColumn,
  ensureTimelineDescriptionAndStagesComment,
} from "@/lib/db";
import { tryPublicObjectUrl } from "@/lib/s3";
import {
  backlogLists,
  backlogTasks,
  documents,
  paymentLedger,
  paymentTextBlocks,
  projectGroups,
  projectDeadlines,
  projects,
  stageTasks,
  stages,
  timelineEntries,
  timelineImages,
  timelineLinks,
  users,
} from "@/lib/db/schema";

export type ProjectStatusFilter = "active" | "paused" | "completed";

export async function listProjectsWithMeta(status: ProjectStatusFilter) {
  await ensureBacklogListColumns();
  await ensureTimelineDescriptionAndStagesComment();

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.status, status))
    .orderBy(asc(projects.dashboardSortOrder), desc(projects.updatedAt));

  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const allGroups = await db.select().from(projectGroups).orderBy(asc(projectGroups.sortOrder));
  const groupById = new Map(allGroups.map((g) => [g.id, g]));

  const deadlines = await db
    .select()
    .from(projectDeadlines)
    .where(inArray(projectDeadlines.projectId, ids));

  const deadlineByProject = new Map(
    deadlines.map((d) => [d.projectId, d]),
  );

  const sums = await db
    .select({
      projectId: paymentLedger.projectId,
      total: sql<number>`coalesce(sum(${paymentLedger.amountRubles}), 0)::int`.mapWith(
        Number,
      ),
    })
    .from(paymentLedger)
    .where(inArray(paymentLedger.projectId, ids))
    .groupBy(paymentLedger.projectId);

  const paidByProject = new Map(sums.map((s) => [s.projectId, s.total]));

  const payBlocks = await db
    .select()
    .from(paymentTextBlocks)
    .where(inArray(paymentTextBlocks.projectId, ids))
    .orderBy(asc(paymentTextBlocks.sortOrder));

  const blocksByProject = new Map<string, typeof payBlocks>();
  for (const b of payBlocks) {
    if (!blocksByProject.has(b.projectId)) blocksByProject.set(b.projectId, []);
    const arr = blocksByProject.get(b.projectId)!;
    // For the dashboard table we need to show all blocks/icons.
    arr.push(b);
  }

  const latestTimelineRows = await db
    .select({
      projectId: timelineEntries.projectId,
      latestEntryDate: sql<string | null>`max(${timelineEntries.entryDate})`,
    })
    .from(timelineEntries)
    .where(inArray(timelineEntries.projectId, ids))
    .groupBy(timelineEntries.projectId);
  const latestTimelineByProject = new Map(
    latestTimelineRows.map((r) => [r.projectId, r.latestEntryDate]),
  );

  const backlogRows = await db
    .select({
      list: backlogLists,
      assignee: users,
    })
    .from(backlogLists)
    .leftJoin(users, eq(backlogLists.assigneeUserId, users.id))
    .where(inArray(backlogLists.projectId, ids))
    .orderBy(asc(backlogLists.sortOrder), desc(backlogLists.id));

  const listsByProject = new Map<string, typeof backlogRows>();
  for (const row of backlogRows) {
    const pid = row.list.projectId;
    if (!listsByProject.has(pid)) listsByProject.set(pid, []);
    listsByProject.get(pid)!.push(row);
  }

  return rows.map((p) => {
    const lists = listsByProject.get(p.id) ?? [];
    if (lists.length === 0) {
      return {
        project: p,
        group: p.groupId ? (groupById.get(p.groupId) ?? null) : null,
        deadline: deadlineByProject.get(p.id) ?? null,
        paidRubles: paidByProject.get(p.id) ?? 0,
        paymentBlocks: blocksByProject.get(p.id) ?? [],
        latestTimelineEntryDate: latestTimelineByProject.get(p.id) ?? null,
        backlogPreview: null,
      };
    }
    const allCompleted = lists.every((r) => r.list.listStatus === "completed");
    if (allCompleted) {
      return {
        project: p,
        group: p.groupId ? (groupById.get(p.groupId) ?? null) : null,
        deadline: deadlineByProject.get(p.id) ?? null,
        paidRubles: paidByProject.get(p.id) ?? 0,
        paymentBlocks: blocksByProject.get(p.id) ?? [],
        latestTimelineEntryDate: latestTimelineByProject.get(p.id) ?? null,
        backlogPreview: { variant: "all_completed" as const },
      };
    }
    const last = lists[lists.length - 1];
    return {
      project: p,
      group: p.groupId ? (groupById.get(p.groupId) ?? null) : null,
      deadline: deadlineByProject.get(p.id) ?? null,
      paidRubles: paidByProject.get(p.id) ?? 0,
      paymentBlocks: blocksByProject.get(p.id) ?? [],
      latestTimelineEntryDate: latestTimelineByProject.get(p.id) ?? null,
      backlogPreview: {
        variant: "active" as const,
        assignee: last.assignee,
        lastListTitle: last.list.title,
        lastListStatus: last.list.listStatus,
        lastFormedAt: last.list.formedAt
          ? typeof last.list.formedAt === "string"
            ? last.list.formedAt.slice(0, 10)
            : String(last.list.formedAt).slice(0, 10)
          : null,
        assigneeAvatarUrl: last.assignee?.avatarKey
          ? tryPublicObjectUrl(last.assignee.avatarKey)
          : null,
      },
    };
  });
}

export async function getProjectFull(
  projectId: string,
  opts?: { timelineLimit?: number; timelineOffset?: number },
) {
  await ensureDocumentsLinkTitleColumn();
  await ensureBacklogListColumns();
  await ensureTimelineDescriptionAndStagesComment();

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return null;

  const [deadline] = await db
    .select()
    .from(projectDeadlines)
    .where(eq(projectDeadlines.projectId, projectId))
    .limit(1);

  const timelineLimit = opts?.timelineLimit;
  const timelineOffset = opts?.timelineOffset ?? 0;

  const entriesQuery = db
    .select()
    .from(timelineEntries)
    .where(eq(timelineEntries.projectId, projectId))
    .orderBy(desc(timelineEntries.entryDate), asc(timelineEntries.sortOrder))
    .$dynamic();

  if (timelineLimit && timelineLimit > 0) {
    entriesQuery.limit(timelineLimit).offset(Math.max(0, timelineOffset));
  }

  const entries = await entriesQuery;
  const [timelineCountRow] = await db
    .select({
      count: sql<number>`count(*)::int`.mapWith(Number),
    })
    .from(timelineEntries)
    .where(eq(timelineEntries.projectId, projectId));


  const entryIds = entries.map((e) => e.id);
  let images: (typeof timelineImages.$inferSelect)[] = [];
  let links: (typeof timelineLinks.$inferSelect)[] = [];
  if (entryIds.length) {
    images = await db
      .select()
      .from(timelineImages)
      .where(inArray(timelineImages.entryId, entryIds))
      .orderBy(asc(timelineImages.sortOrder));
    links = await db
      .select()
      .from(timelineLinks)
      .where(inArray(timelineLinks.entryId, entryIds))
      .orderBy(asc(timelineLinks.sortOrder));
  }

  const stagesRows = await db
    .select()
    .from(stages)
    .where(eq(stages.projectId, projectId))
    .orderBy(asc(stages.sortOrder));

  const stageIds = stagesRows.map((s) => s.id);
  let tasks: (typeof stageTasks.$inferSelect)[] = [];
  if (stageIds.length) {
    tasks = await db
      .select()
      .from(stageTasks)
      .where(inArray(stageTasks.stageId, stageIds))
      .orderBy(asc(stageTasks.sortOrder));
  }

  const ledger = await db
    .select()
    .from(paymentLedger)
    .where(eq(paymentLedger.projectId, projectId))
    .orderBy(desc(paymentLedger.paymentDate));

  const blocks = await db
    .select()
    .from(paymentTextBlocks)
    .where(eq(paymentTextBlocks.projectId, projectId))
    .orderBy(asc(paymentTextBlocks.sortOrder));

  let docs: (typeof documents.$inferSelect)[];
  try {
    docs = await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.docDate));
  } catch {
    const rows = await db
      .select({
        id: documents.id,
        projectId: documents.projectId,
        docDate: documents.docDate,
        url: documents.url,
        comment: documents.comment,
      })
      .from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.docDate));
    docs = rows.map((r) => ({ ...r, linkTitle: null as string | null }));
  }

  const blists = await db
    .select({
      list: backlogLists,
      assignee: users,
    })
    .from(backlogLists)
    .leftJoin(users, eq(backlogLists.assigneeUserId, users.id))
    .where(eq(backlogLists.projectId, projectId))
    .orderBy(asc(backlogLists.sortOrder));

  const blids = blists.map((b) => b.list.id);
  let btasks: (typeof backlogTasks.$inferSelect)[] = [];
  if (blids.length) {
    btasks = await db
      .select()
      .from(backlogTasks)
      .where(inArray(backlogTasks.listId, blids))
      .orderBy(asc(backlogTasks.sortOrder));
  }

  return {
    project,
    deadline: deadline ?? null,
    timeline: { entries, images, links, total: timelineCountRow?.count ?? 0 },
    stages: stagesRows,
    stageTasks: tasks,
    payments: {
      ledger,
      textBlocks: blocks,
      documents: docs,
    },
    backlog: { lists: blists, tasks: btasks },
  };
}

export async function getProjectBySlug(slug: string) {
  const [p] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);
  return p ?? null;
}
