CREATE TABLE "access_roles" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "access_roles" ("key", "label", "description", "is_system") VALUES
	('admin', 'Admin', 'Full workspace access', true),
	('manager', 'Manager', 'Team operations', true),
	('member', 'Member', 'Individual contributor', true);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_access_roles_key_fk" FOREIGN KEY ("role") REFERENCES "public"."access_roles"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_access_roles_key_fk" FOREIGN KEY ("role") REFERENCES "public"."access_roles"("key") ON DELETE no action ON UPDATE no action;
