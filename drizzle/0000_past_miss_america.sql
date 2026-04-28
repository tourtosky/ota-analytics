CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"viator_product_code" varchar(20) NOT NULL,
	"product_title" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"overall_score" integer,
	"scores" jsonb,
	"product_data" jsonb,
	"competitors_data" jsonb,
	"recommendations" jsonb,
	"review_insights" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "scraped_pages" (
	"url" text PRIMARY KEY NOT NULL,
	"platform" varchar(20) NOT NULL,
	"html" text,
	"parsed_data" jsonb NOT NULL,
	"scraped_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
