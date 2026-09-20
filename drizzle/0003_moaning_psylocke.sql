DROP INDEX "issues_project_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "issues_project_number_unique" ON "issues" USING btree ("project_id","number");