import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["admin", "employee"]);

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "paused",
  "completed",
]);

export const cmsEnum = pgEnum("cms", [
  "tilda",
  "wordpress",
  "opencart",
  "modx",
  "bitrix",
  "pure_code",
]);

export const paymentTextColorEnum = pgEnum("payment_text_color", [
  "green",
  "gray",
]);

export const backlogListStatusEnum = pgEnum("backlog_list_status", [
  "not_started",
  "in_progress",
  "completed",
  "rejected",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  login: varchar("login", { length: 128 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 128 }).notNull(),
  lastName: varchar("last_name", { length: 128 }).notNull(),
  role: userRoleEnum("role").notNull().default("employee"),
  avatarKey: text("avatar_key"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerName: varchar("customer_name", { length: 512 }).notNull(),
    phone: varchar("phone", { length: 64 }),
    pinView: varchar("pin_view", { length: 4 }).notNull(),
    shortDescription: text("short_description"),
    longDescription: text("long_description"),
    cms: cmsEnum("cms"),
    status: projectStatusEnum("status").notNull().default("active"),
    slug: varchar("slug", { length: 6 }).notNull(),
    lkTitle: varchar("lk_title", { length: 512 }).notNull().default("Личный кабинет"),
    lkShowBacklog: boolean("lk_show_backlog").notNull().default(false),
    lkStagesComment: text("lk_stages_comment"),
    remainingAmountRubles: integer("remaining_amount_rubles").notNull().default(0),
    dashboardSortOrder: integer("dashboard_sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("projects_slug_idx").on(t.slug)],
);

export const projectDeadlines = pgTable("project_deadlines", {
  projectId: uuid("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  comment: text("comment"),
});

export const timelineEntries = pgTable("timeline_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  entryDate: date("entry_date").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const timelineImages = pgTable("timeline_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryId: uuid("entry_id")
    .notNull()
    .references(() => timelineEntries.id, { onDelete: "cascade" }),
  originalKey: text("original_key").notNull(),
  webpKey: text("webp_key").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const timelineLinks = pgTable("timeline_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryId: uuid("entry_id")
    .notNull()
    .references(() => timelineEntries.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  linkTitle: varchar("link_title", { length: 512 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const stages = pgTable("stages", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 512 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const stageTasks = pgTable("stage_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  stageId: uuid("stage_id")
    .notNull()
    .references(() => stages.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  done: boolean("done").notNull().default(false),
  completedAt: date("completed_at"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const paymentLedger = pgTable("payment_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  amountRubles: integer("amount_rubles").notNull(),
  paymentDate: date("payment_date").notNull(),
  comment: text("comment"),
});

export const paymentTextBlocks = pgTable("payment_text_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  body: text("body"),
  color: paymentTextColorEnum("color").notNull().default("gray"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  docDate: date("doc_date").notNull(),
  url: text("url").notNull(),
  linkTitle: varchar("link_title", { length: 512 }),
  comment: text("comment"),
});

export const backlogLists = pgTable("backlog_lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 512 }).notNull(),
  assigneeUserId: uuid("assignee_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  listStatus: backlogListStatusEnum("list_status").notNull().default("not_started"),
  formedAt: date("formed_at").notNull().default(sql`CURRENT_DATE`),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const backlogTasks = pgTable("backlog_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  listId: uuid("list_id")
    .notNull()
    .references(() => backlogLists.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  done: boolean("done").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const usersRelations = relations(users, ({ many }) => ({
  assignedBacklogs: many(backlogLists),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  deadline: one(projectDeadlines, {
    fields: [projects.id],
    references: [projectDeadlines.projectId],
  }),
  timelineEntries: many(timelineEntries),
  stages: many(stages),
  payments: many(paymentLedger),
  paymentBlocks: many(paymentTextBlocks),
  documents: many(documents),
  backlogLists: many(backlogLists),
}));

export const projectDeadlinesRelations = relations(projectDeadlines, ({ one }) => ({
  project: one(projects, {
    fields: [projectDeadlines.projectId],
    references: [projects.id],
  }),
}));

export const timelineEntriesRelations = relations(timelineEntries, ({ one, many }) => ({
  project: one(projects, {
    fields: [timelineEntries.projectId],
    references: [projects.id],
  }),
  images: many(timelineImages),
  links: many(timelineLinks),
}));

export const timelineImagesRelations = relations(timelineImages, ({ one }) => ({
  entry: one(timelineEntries, {
    fields: [timelineImages.entryId],
    references: [timelineEntries.id],
  }),
}));

export const timelineLinksRelations = relations(timelineLinks, ({ one }) => ({
  entry: one(timelineEntries, {
    fields: [timelineLinks.entryId],
    references: [timelineEntries.id],
  }),
}));

export const stagesRelations = relations(stages, ({ one, many }) => ({
  project: one(projects, {
    fields: [stages.projectId],
    references: [projects.id],
  }),
  tasks: many(stageTasks),
}));

export const stageTasksRelations = relations(stageTasks, ({ one }) => ({
  stage: one(stages, {
    fields: [stageTasks.stageId],
    references: [stages.id],
  }),
}));

export const backlogListsRelations = relations(backlogLists, ({ one, many }) => ({
  project: one(projects, {
    fields: [backlogLists.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [backlogLists.assigneeUserId],
    references: [users.id],
  }),
  tasks: many(backlogTasks),
}));

export const backlogTasksRelations = relations(backlogTasks, ({ one }) => ({
  list: one(backlogLists, {
    fields: [backlogTasks.listId],
    references: [backlogLists.id],
  }),
}));
