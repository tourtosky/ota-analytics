import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, serial, index, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { DiscoveredListing } from "@/lib/viator/types";

export const userRoleEnum = pgEnum("user_role", ["admin", "client"]);
export const userPlanEnum = pgEnum("user_plan", ["free", "growth", "pro"]);
export const blogPostStatusEnum = pgEnum("blog_post_status", ["draft", "published", "archived"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // matches Supabase auth.users.id
  role: userRoleEnum("role").default("client").notNull(),
  plan: userPlanEnum("plan").default("free").notNull(),
  fullName: text("full_name"),
  companyName: text("company_name"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Profile = InferSelectModel<typeof profiles>;
export type NewProfile = InferInsertModel<typeof profiles>;

export const analyses = pgTable("analyses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id"),
  viatorProductCode: varchar("viator_product_code", { length: 20 }).notNull(),
  productTitle: text("product_title"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  overallScore: integer("overall_score"),
  scores: jsonb("scores").$type<{
    title: number;
    description: number;
    pricing: number;
    reviews: number;
    photos: number;
    completeness: number;
  }>(),
  productData: jsonb("product_data"),
  competitorsData: jsonb("competitors_data"),
  recommendations: jsonb("recommendations"),
  reviewInsights: jsonb("review_insights"),
  listings: jsonb("listings").$type<DiscoveredListing[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  dataSource: varchar("data_source", { length: 20 }),
  progress: jsonb("progress").$type<{
    step: string;
    percent: number;
    message: string;
  }>(),
});

export type Analysis = InferSelectModel<typeof analyses>;
export type NewAnalysis = InferInsertModel<typeof analyses>;

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id").references(() => profiles.id),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    contentMarkdown: text("content_markdown").notNull(),
    category: varchar("category", { length: 80 }).default("Guides").notNull(),
    coverImageUrl: text("cover_image_url"),
    status: blogPostStatusEnum("status").default("draft").notNull(),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    readingTime: varchar("reading_time", { length: 30 }).default("1 min read").notNull(),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("blog_posts_slug_idx").on(table.slug),
    index("blog_posts_status_published_idx").on(table.status, table.publishedAt),
    index("blog_posts_author_idx").on(table.authorId),
  ]
);

export type BlogPost = InferSelectModel<typeof blogPosts>;
export type NewBlogPost = InferInsertModel<typeof blogPosts>;

export const scrapedPages = pgTable("scraped_pages", {
  url: text("url").primaryKey(),
  platform: varchar("platform", { length: 20 }).notNull(),
  html: text("html"),
  // NOTE: parsedData omits .$type<ScrapedListing>() to avoid a dependency cycle.
  // lib/scraping/utils/cache.ts casts to ScrapedListing on read.
  parsedData: jsonb("parsed_data").notNull(),
  scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const adminEvents = pgTable(
  "admin_events",
  {
    id: serial("id").primaryKey(),
    event: varchar("event", { length: 50 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("admin_events_event_created_idx").on(table.event, table.createdAt),
  ]
);
