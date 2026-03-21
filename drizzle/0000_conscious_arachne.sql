CREATE TYPE "public"."cms" AS ENUM('tilda', 'wordpress', 'opencart', 'modx', 'bitrix', 'pure_code');--> statement-breakpoint
CREATE TYPE "public"."payment_text_color" AS ENUM('green', 'gray');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'employee');--> statement-breakpoint
CREATE TABLE "backlog_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(512) NOT NULL,
	"assignee_user_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backlog_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"description" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"doc_date" date NOT NULL,
	"url" text NOT NULL,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "payment_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"amount_rubles" integer NOT NULL,
	"payment_date" date NOT NULL,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "payment_text_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"body" text,
	"color" "payment_text_color" DEFAULT 'gray' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_deadlines" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" varchar(512) NOT NULL,
	"phone" varchar(64),
	"pin_view" varchar(4) NOT NULL,
	"short_description" text,
	"long_description" text,
	"cms" "cms",
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"slug" varchar(6) NOT NULL,
	"lk_title" varchar(512) DEFAULT 'Личный кабинет' NOT NULL,
	"remaining_amount_rubles" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"description" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"completed_at" date,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(512) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"original_key" text NOT NULL,
	"webp_key" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"url" text NOT NULL,
	"link_title" varchar(512) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"login" varchar(128) NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" varchar(128) NOT NULL,
	"last_name" varchar(128) NOT NULL,
	"role" "user_role" DEFAULT 'employee' NOT NULL,
	"avatar_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_login_unique" UNIQUE("login")
);
--> statement-breakpoint
ALTER TABLE "backlog_lists" ADD CONSTRAINT "backlog_lists_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backlog_lists" ADD CONSTRAINT "backlog_lists_assignee_user_id_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backlog_tasks" ADD CONSTRAINT "backlog_tasks_list_id_backlog_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."backlog_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_ledger" ADD CONSTRAINT "payment_ledger_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_text_blocks" ADD CONSTRAINT "payment_text_blocks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_deadlines" ADD CONSTRAINT "project_deadlines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_tasks" ADD CONSTRAINT "stage_tasks_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_images" ADD CONSTRAINT "timeline_images_entry_id_timeline_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."timeline_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_links" ADD CONSTRAINT "timeline_links_entry_id_timeline_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."timeline_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_idx" ON "projects" USING btree ("slug");