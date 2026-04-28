CREATE TYPE "public"."user_plan" AS ENUM('free', 'growth', 'pro');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'client');--> statement-breakpoint
CREATE TABLE "admin_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event" varchar(50) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "user_role" DEFAULT 'client' NOT NULL,
	"plan" "user_plan" DEFAULT 'free' NOT NULL,
	"full_name" text,
	"company_name" text,
	"stripe_customer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "listings" jsonb;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "data_source" varchar(20);--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "progress" jsonb;--> statement-breakpoint
CREATE INDEX "admin_events_event_created_idx" ON "admin_events" USING btree ("event","created_at");