CREATE TYPE "public"."blog_post_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"slug" varchar(160) NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"content_markdown" text NOT NULL,
	"category" varchar(80) DEFAULT 'Guides' NOT NULL,
	"cover_image_url" text,
	"status" "blog_post_status" DEFAULT 'draft' NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"reading_time" varchar(30) DEFAULT '1 min read' NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_posts_status_published_idx" ON "blog_posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "blog_posts_author_idx" ON "blog_posts" USING btree ("author_id");