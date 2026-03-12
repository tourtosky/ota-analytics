import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, serial, index } from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const analyses = pgTable("analyses", {
  id: uuid("id").defaultRandom().primaryKey(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  dataSource: varchar("data_source", { length: 20 }),
});

export type Analysis = InferSelectModel<typeof analyses>;
export type NewAnalysis = InferInsertModel<typeof analyses>;

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
