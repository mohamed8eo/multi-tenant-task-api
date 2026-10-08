CREATE TYPE "project_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "task_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "task_status" AS ENUM('todo', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "project_status" DEFAULT 'active'::"project_status" NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_id_org_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'todo'::"task_status" NOT NULL,
	"priority" "task_priority" DEFAULT 'medium'::"task_priority" NOT NULL,
	"assignee_id" uuid,
	"created_by" uuid,
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_id_org_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "projects_org_status_idx" ON "projects" ("organization_id","status");--> statement-breakpoint
CREATE INDEX "tasks_org_project_idx" ON "tasks" ("organization_id","project_id");--> statement-breakpoint
CREATE INDEX "tasks_org_status_idx" ON "tasks" ("organization_id","status");--> statement-breakpoint
CREATE INDEX "tasks_org_assignee_idx" ON "tasks" ("organization_id","assignee_id");--> statement-breakpoint
CREATE INDEX "comments_org_task_created_idx" ON "comments" ("organization_id","task_id","created_at");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_org_fk" FOREIGN KEY ("project_id","organization_id") REFERENCES "projects"("id","organization_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_task_org_fk" FOREIGN KEY ("task_id","organization_id") REFERENCES "tasks"("id","organization_id") ON DELETE CASCADE;