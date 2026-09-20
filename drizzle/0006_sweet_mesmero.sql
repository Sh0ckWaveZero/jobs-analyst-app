CREATE TABLE "permissions" (
	"key" text PRIMARY KEY NOT NULL,
	"group" text NOT NULL,
	"label" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"protected_for_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "permissions" ("key", "group", "label", "description", "is_system", "protected_for_admin") VALUES
	('users.manage', 'Workspace', 'Manage users', 'Create, update, assign roles and deactivate workspace users.', true, true),
	('departments.manage', 'Workspace', 'Manage departments', 'Create, rename and remove departments used for team scope.', true, true),
	('roles.manage', 'Workspace', 'Manage roles & permissions', 'Change the permission matrix and role assignments.', true, true),
	('projects.manage', 'Projects', 'Manage projects', 'Create projects and update projects within the role scope.', true, false),
	('issues.create', 'Issues', 'Create issues', 'Create new issues in active projects.', true, false),
	('issues.manage_all', 'Issues', 'Manage all issues', 'Update or delete any issue regardless of ownership.', true, false),
	('issues.manage_owned', 'Issues', 'Manage owned-project issues', 'Update or delete issues in projects owned by the user.', true, false),
	('issues.manage_assigned', 'Issues', 'Manage assigned issues', 'Update or delete issues reported or assigned to the user.', true, false),
	('issues.assign_any', 'Issues', 'Assign to anyone', 'Assign issues to any workspace user.', true, false),
	('issues.assign_department', 'Issues', 'Assign within department', 'Assign issues to yourself or a colleague in your department.', true, false),
	('time_entries.create', 'Time tracking', 'Log time', 'Start a timer or add a manual time entry.', true, false),
	('time_entries.manage_all', 'Time tracking', 'Manage all time entries', 'Edit or remove time entries created by other users.', true, false),
	('reports.view_all', 'Reports', 'View all reports', 'See work-hour reports across every project and user.', true, false),
	('reports.view_team', 'Reports', 'View team reports', 'See reports for owned projects and the user''s own work.', true, false),
	('reports.view_own', 'Reports', 'View own reports', 'See work-hour reports for the current user only.', true, false);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_permissions_key_fk" FOREIGN KEY ("permission") REFERENCES "public"."permissions"("key") ON DELETE cascade ON UPDATE no action;
