# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin dashboard to TourBoost with full visibility into analyses, scraping health, and API usage.

**Architecture:** Single-page admin panel protected by env var secret via Next.js middleware cookie auth. Event logging via fire-and-forget inserts to `admin_events` table. One stats API endpoint returns all dashboard data; one detail endpoint returns full analysis JSON.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, PostgreSQL, Tailwind CSS 4, React 19 ("use client")

**Spec:** `docs/superpowers/specs/2026-03-12-admin-panel-design.md`

---

## File Structure

**New files:**
| File | Responsibility |
|------|---------------|
| `middleware.ts` | Intercepts `/admin` + `/api/admin` routes, validates `ADMIN_SECRET` via cookie |
| `lib/admin/events.ts` | `logAdminEvent()` fire-and-forget utility |
| `app/admin/page.tsx` | Single-page admin dashboard (client component) |
| `app/api/admin/stats/route.ts` | GET — stats, paginated analyses, event aggregates |
| `app/api/admin/analysis/[id]/route.ts` | GET — full analysis detail by ID |

**Modified files:**
| File | Change |
|------|--------|
| `lib/db/schema.ts` | Add `dataSource` column to `analyses`, add `adminEvents` table with index |
| `app/api/analyze/route.ts` | Add event logging calls, populate `dataSource`, fix `.catch()` await bug |
| `lib/scraping/viator/scraper.ts` | Add scrape event logging (cache hit, success, blocked) |
| `lib/viator/client.ts` | Add API call event logging with duration tracking |
| `lib/analysis/recommendations.ts` | Add Anthropic API call event logging with duration tracking |
| `.env.local.example` | Add `ADMIN_SECRET` |

---

## Chunk 1: Database & Event Logging Infrastructure

### Task 1: Add `dataSource` column and `adminEvents` table to schema

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add imports for index and serial**

Add `index` and `serial` to the drizzle-orm imports at the top of the file:

```typescript
import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, serial, index } from "drizzle-orm/pg-core";
```

- [ ] **Step 2: Add `dataSource` column to `analyses` table**

Add after the `completedAt` column (line 23):

```typescript
  dataSource: varchar("data_source", { length: 20 }),
```

- [ ] **Step 3: Add `adminEvents` table**

Add after the `scrapedPages` table definition:

```typescript
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
```

- [ ] **Step 4: Push schema to database**

Run: `npm run db:push`

Expected: Schema synced — new column `data_source` on `analyses`, new table `admin_events` with composite index.

---

### Task 2: Create event logging utility

**Files:**
- Create: `lib/admin/events.ts`

- [ ] **Step 1: Create the events utility file**

```typescript
import { db } from "@/lib/db";
import { adminEvents } from "@/lib/db/schema";

/**
 * Log an admin event. Fire-and-forget — never blocks the caller.
 * Call WITHOUT await at call sites.
 */
export function logAdminEvent(
  event: string,
  metadata: Record<string, unknown>
): void {
  db.insert(adminEvents)
    .values({ event, metadata })
    .then(() => {})
    .catch((err) => {
      console.error(`[admin-events] Failed to log ${event}:`, err);
    });
}
```

---

### Task 3: Add event logging to the analysis pipeline

**Files:**
- Modify: `app/api/analyze/route.ts`

- [ ] **Step 1: Add import**

Add to imports at the top of the file:

```typescript
import { logAdminEvent } from "@/lib/admin/events";
```

- [ ] **Step 2: Fix the `.catch()` await bug and add failure event logging**

Replace lines 35-44 (the fire-and-forget `.catch()` block):

```typescript
    // Start processing asynchronously (don't await)
    processAnalysis(analysis.id, productCode).catch(async (error) => {
      console.error("Error processing analysis:", error);
      // Update status to failed
      await db.update(analyses)
        .set({
          status: "failed",
          completedAt: new Date(),
        })
        .where(eq(analyses.id, analysis.id));
      logAdminEvent("analysis_failed", {
        analysisId: analysis.id,
        error: error instanceof Error ? error.message : String(error),
      });
    });
```

- [ ] **Step 3: Add `analysis_started` event after record creation**

After the `.returning()` call (after line 32), add:

```typescript
    logAdminEvent("analysis_started", {
      productCode,
      analysisId: analysis.id,
    });
```

- [ ] **Step 4: Add `dataSource` to the final DB update and add `analysis_completed` event**

First, add `const pipelineStart = Date.now();` as the first line inside the `try` block of `processAnalysis()` (line 60).

Then replace the final `db.update` block (around line 182) with:

```typescript
    // 6. Update analysis with results
    await db
      .update(analyses)
      .set({
        productTitle: mergedProduct.title,
        status: "completed",
        overallScore: scores.overall,
        scores: {
          title: scores.title,
          description: scores.description,
          pricing: scores.pricing,
          reviews: scores.reviews,
          photos: scores.photos,
          completeness: scores.completeness,
        },
        productData: mergedProduct as unknown as Record<string, unknown>,
        competitorsData: competitors as any,
        recommendations: recommendations as any,
        reviewInsights: reviewInsights as any,
        completedAt: new Date(),
        dataSource: mergedProduct.dataSource,
      })
      .where(eq(analyses.id, analysisId));

    console.log(`Analysis ${analysisId} completed successfully`);
    logAdminEvent("analysis_completed", {
      analysisId,
      score: scores.overall,
      dataSource: mergedProduct.dataSource,
      durationMs: Date.now() - pipelineStart,
    });
```

---

### Task 4: Add event logging to the scraper

**Files:**
- Modify: `lib/scraping/viator/scraper.ts`

- [ ] **Step 1: Add import**

Add to the imports at the top:

```typescript
import { logAdminEvent } from "@/lib/admin/events";
```

- [ ] **Step 2: Add cache hit event**

In the `scrape()` method, after the cache hit console.log (line 31), add:

```typescript
      logAdminEvent("scrape_cache_hit", { url, productCode: this.extractProductCode(url) });
```

- [ ] **Step 3: Add success event with duration tracking**

Wrap the `withRetry` call with timing. Replace the try block in `scrape()` (lines 37-42):

```typescript
    try {
      const scrapeStart = Date.now();
      const listing = await withRetry(() => this.scrapeOnce(url));
      if (listing.scrapeSuccess) {
        await setCachedListing(url, "viator", listing);
      }
      logAdminEvent("scrape_success", {
        url,
        productCode: this.extractProductCode(url),
        durationMs: Date.now() - scrapeStart,
      });
      return { listing, cached: false };
    }
```

- [ ] **Step 4: Add blocked event**

In the catch block (around line 43-46), the variable `error` is already a string (`err instanceof Error ? err.message : String(err)`). Add the DataDome event after the console.error:

```typescript
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[viator-scraper] All retries failed for ${url}:`, error);
      if (error.includes("DataDome")) {
        logAdminEvent("scrape_blocked", { url, reason: "DataDome" });
      }
      return { listing: null, cached: false, error };
```

---

### Task 5: Add event logging to Viator API client

**Files:**
- Modify: `lib/viator/client.ts`

- [ ] **Step 1: Add import**

```typescript
import { logAdminEvent } from "@/lib/admin/events";
```

- [ ] **Step 2: Add timing and event logging around the fetch call**

Wrap the existing fetch with timing. Replace the try block (lines 33-49):

```typescript
  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const durationMs = Date.now() - startTime;
    logAdminEvent("api_call", { service: "viator", endpoint, durationMs });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Viator API error: ${response.status} ${response.statusText}. ${
          JSON.stringify(errorData)
        }`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred while fetching from Viator API");
  }
```

---

### Task 6: Add event logging to Anthropic API calls

**Files:**
- Modify: `lib/analysis/recommendations.ts`

- [ ] **Step 1: Add import**

```typescript
import { logAdminEvent } from "@/lib/admin/events";
```

- [ ] **Step 2: Add timing to `generateRecommendations()`**

Wrap the `anthropic.messages.create()` call (around line 96):

```typescript
    const startTime = Date.now();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: systemPrompt + "\n\n" + userMessage,
        },
      ],
    });
    logAdminEvent("api_call", {
      service: "anthropic",
      endpoint: "messages",
      durationMs: Date.now() - startTime,
    });
```

- [ ] **Step 3: Add timing to `generateReviewInsights()`**

Same pattern around the `anthropic.messages.create()` call (around line 173):

```typescript
    const startTime = Date.now();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: systemPrompt + "\n\n" + userMessage,
        },
      ],
    });
    logAdminEvent("api_call", {
      service: "anthropic",
      endpoint: "messages",
      durationMs: Date.now() - startTime,
    });
```

---

### Task 7: Add `ADMIN_SECRET` to env example

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 1: Add the new env var**

Append to the file:

```
ADMIN_SECRET=change-me-to-a-random-secret
```

---

## Chunk 2: Auth Middleware

### Task 8: Create admin auth middleware

**Files:**
- Create: `middleware.ts` (project root)

- [ ] **Step 1: Create the middleware file**

```typescript
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/admin");
  const isAdminPage = pathname.startsWith("/admin");

  if (!isApiRoute && !isAdminPage) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    // No secret configured — block all admin access
    if (isApiRoute) {
      return NextResponse.json({ error: "Admin not configured" }, { status: 503 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Check for key in query param (initial login)
  const keyParam = request.nextUrl.searchParams.get("key");
  if (keyParam === secret) {
    // Set cookie and redirect to clean URL (without key in query string)
    const cleanUrl = new URL(request.url);
    cleanUrl.searchParams.delete("key");
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set("admin_token", secret, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  }

  // Check cookie
  const cookie = request.cookies.get("admin_token")?.value;
  if (cookie === secret) {
    return NextResponse.next();
  }

  // Not authenticated
  if (isApiRoute) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
```

- [ ] **Step 2: Verify middleware works**

1. Set `ADMIN_SECRET=test123` in `.env.local`
2. Run `npm run dev`
3. Visit `http://localhost:3000/admin` — should redirect to `/`
4. Visit `http://localhost:3000/admin?key=test123` — should set cookie and redirect to `/admin` (will 404 for now, which is expected)
5. Visit `http://localhost:3000/admin` again — should pass through (cookie set)

---

## Chunk 3: API Endpoints

### Task 9: Create the stats API endpoint

**Files:**
- Create: `app/api/admin/stats/route.ts`

- [ ] **Step 1: Create the stats route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyses, adminEvents } from "@/lib/db/schema";
import { eq, sql, and, gte, ilike, desc, count } from "drizzle-orm";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const statusFilter = searchParams.get("status") || "all";
  const dataSourceFilter = searchParams.get("dataSource") || "all";
  const search = searchParams.get("search") || "";

  // Build filter conditions for analyses
  const conditions = [];
  if (statusFilter !== "all") {
    conditions.push(eq(analyses.status, statusFilter));
  }
  if (dataSourceFilter !== "all") {
    if (dataSourceFilter === "api-only") {
      // Include null (legacy rows) as api-only
      conditions.push(
        sql`(${analyses.dataSource} = 'api-only' OR ${analyses.dataSource} IS NULL)`
      );
    } else {
      conditions.push(eq(analyses.dataSource, dataSourceFilter));
    }
  }
  if (search) {
    conditions.push(ilike(analyses.viatorProductCode, `%${search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Run queries in parallel
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    statsResult,
    analysisItems,
    totalResult,
    todayResult,
    cacheResult,
    scrapingEvents,
    apiEvents,
    recentScrapingEvents,
    recentApiEvents,
  ] = await Promise.all([
    // Aggregate stats
    db
      .select({
        total: count(),
        completed: sql<number>`count(*) filter (where ${analyses.status} = 'completed')`,
        failed: sql<number>`count(*) filter (where ${analyses.status} = 'failed')`,
        avgScore: sql<number>`round(avg(${analyses.overallScore}))`,
      })
      .from(analyses),

    // Paginated analyses list
    db
      .select({
        id: analyses.id,
        viatorProductCode: analyses.viatorProductCode,
        productTitle: analyses.productTitle,
        status: analyses.status,
        overallScore: analyses.overallScore,
        dataSource: analyses.dataSource,
        competitorCount: sql<number>`jsonb_array_length(coalesce(${analyses.competitorsData}, '[]'::jsonb))`,
        createdAt: analyses.createdAt,
        completedAt: analyses.completedAt,
      })
      .from(analyses)
      .where(whereClause)
      .orderBy(desc(analyses.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),

    // Total count for pagination (with filters)
    db
      .select({ count: count() })
      .from(analyses)
      .where(whereClause),

    // Today's count
    db
      .select({ count: count() })
      .from(analyses)
      .where(gte(analyses.createdAt, todayStart)),

    // Cache entries count
    db.execute(sql`SELECT count(*) as count FROM scraped_pages`),

    // Scraping event aggregates
    db
      .select({
        event: adminEvents.event,
        count: count(),
      })
      .from(adminEvents)
      .where(sql`${adminEvents.event} LIKE 'scrape_%'`)
      .groupBy(adminEvents.event),

    // API event aggregates
    db.execute(sql`
      SELECT
        (metadata->>'service') as service,
        count(*) as total,
        count(*) filter (where ${adminEvents.createdAt} >= ${todayStart}) as today
      FROM admin_events
      WHERE event = 'api_call'
      GROUP BY metadata->>'service'
    `),

    // Recent scraping events (last 50)
    db
      .select()
      .from(adminEvents)
      .where(sql`${adminEvents.event} LIKE 'scrape_%'`)
      .orderBy(desc(adminEvents.createdAt))
      .limit(50),

    // Recent API events (last 50)
    db
      .select()
      .from(adminEvents)
      .where(eq(adminEvents.event, "api_call"))
      .orderBy(desc(adminEvents.createdAt))
      .limit(50),
  ]);

  const stats = statsResult[0];
  const total = totalResult[0].count;
  const todayCount = todayResult[0].count;
  const cacheEntries = Number((cacheResult as any)[0]?.count ?? 0);

  // Build scraping summary
  const scrapeMap = Object.fromEntries(
    scrapingEvents.map((e) => [e.event, Number(e.count)])
  );
  const totalScrapeAttempts =
    (scrapeMap["scrape_success"] || 0) +
    (scrapeMap["scrape_blocked"] || 0);

  // Build API summary
  const apiMap: Record<string, { total: number; today: number }> = {};
  for (const row of apiEvents as any[]) {
    apiMap[row.service] = {
      total: Number(row.total),
      today: Number(row.today),
    };
  }

  const successRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  const scrapeSuccessRate = totalScrapeAttempts > 0
    ? Math.round(((scrapeMap["scrape_success"] || 0) / totalScrapeAttempts) * 100)
    : 0;

  return NextResponse.json({
    stats: {
      totalAnalyses: stats.total,
      completedCount: stats.completed,
      failedCount: stats.failed,
      successRate,
      avgScore: stats.avgScore || 0,
      todayCount,
      scrapeSuccessRate,
      cacheEntries,
    },
    analyses: {
      items: analysisItems,
      total,
      page,
      pageSize: PAGE_SIZE,
    },
    events: {
      scraping: {
        totalAttempts: totalScrapeAttempts,
        successCount: scrapeMap["scrape_success"] || 0,
        blockedCount: scrapeMap["scrape_blocked"] || 0,
        cacheHitCount: scrapeMap["scrape_cache_hit"] || 0,
        recentEvents: recentScrapingEvents,
      },
      api: {
        viatorCallsToday: apiMap["viator"]?.today || 0,
        viatorCallsTotal: apiMap["viator"]?.total || 0,
        anthropicCallsToday: apiMap["anthropic"]?.today || 0,
        anthropicCallsTotal: apiMap["anthropic"]?.total || 0,
        recentEvents: recentApiEvents,
      },
    },
  });
}
```

---

### Task 10: Create the analysis detail API endpoint

**Files:**
- Create: `app/api/admin/analysis/[id]/route.ts`

- [ ] **Step 1: Create the detail route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [analysis] = await db
    .select()
    .from(analyses)
    .where(eq(analyses.id, id))
    .limit(1);

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  return NextResponse.json(analysis);
}
```

---

## Chunk 4: Admin Dashboard Frontend

### Task 11: Create the admin page

**Files:**
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Create the admin dashboard page**

This is a large single-file client component. Key sections:

1. **Types** — interfaces for API response shapes
2. **Data fetching** — `useSWR`-style polling with `useState` + `useEffect`
3. **Stats cards** — 5 summary cards (always visible)
4. **Tab bar** — Analyses | Scraping Health | API Usage
5. **Analyses tab** — filters, table with expandable rows, pagination
6. **Scraping tab** — summary cards + recent events table
7. **API tab** — summary cards + recent events table
8. **Loading/error/empty states**

```typescript
"use client";

import { useState, useEffect, useCallback, Fragment } from "react";

// ─── Types ───────────────────────────────────────────────────

interface Stats {
  totalAnalyses: number;
  completedCount: number;
  failedCount: number;
  successRate: number;
  avgScore: number;
  todayCount: number;
  scrapeSuccessRate: number;
  cacheEntries: number;
}

interface AnalysisItem {
  id: string;
  viatorProductCode: string;
  productTitle: string | null;
  status: string;
  overallScore: number | null;
  dataSource: string | null;
  competitorCount: number;
  createdAt: string;
  completedAt: string | null;
}

interface AnalysisDetail {
  id: string;
  viatorProductCode: string;
  productTitle: string | null;
  status: string;
  overallScore: number | null;
  scores: {
    title: number;
    description: number;
    pricing: number;
    reviews: number;
    photos: number;
    completeness: number;
  } | null;
  productData: Record<string, unknown> | null;
  competitorsData: Record<string, unknown>[] | null;
  recommendations: Record<string, unknown>[] | null;
  reviewInsights: Record<string, unknown> | null;
  dataSource: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface ScrapingEvents {
  totalAttempts: number;
  successCount: number;
  blockedCount: number;
  cacheHitCount: number;
  recentEvents: { id: number; event: string; metadata: Record<string, unknown>; createdAt: string }[];
}

interface ApiEvents {
  viatorCallsToday: number;
  viatorCallsTotal: number;
  anthropicCallsToday: number;
  anthropicCallsTotal: number;
  recentEvents: { id: number; event: string; metadata: Record<string, unknown>; createdAt: string }[];
}

interface DashboardData {
  stats: Stats;
  analyses: {
    items: AnalysisItem[];
    total: number;
    page: number;
    pageSize: number;
  };
  events: {
    scraping: ScrapingEvents;
    api: ApiEvents;
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-gray-50 text-gray-400";
  if (score >= 70) return "bg-green-50 text-green-600";
  if (score >= 40) return "bg-yellow-50 text-yellow-600";
  return "bg-red-50 text-red-600";
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: "bg-green-50 text-green-600",
    failed: "bg-red-50 text-red-600",
    processing: "bg-blue-50 text-blue-600",
    pending: "bg-gray-100 text-gray-500",
  };
  return map[status] || "bg-gray-100 text-gray-500";
}

function dataSourceBadge(ds: string | null) {
  if (ds === "api+scrape") return "bg-blue-50 text-blue-600";
  return "bg-gray-100 text-gray-500";
}

// ─── Component ───────────────────────────────────────────────

export default function AdminPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"analyses" | "scraping" | "api">("analyses");

  // Filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dataSourceFilter, setDataSourceFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AnalysisDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        status: statusFilter,
        dataSource: dataSourceFilter,
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/stats?${params}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, dataSourceFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/analysis/${id}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      setDetail(await res.json());
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = data ? Math.ceil(data.analyses.total / data.analyses.pageSize) : 0;

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] font-sans p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]">
            Tour<span className="text-[#0ea5e9]">Boost</span> Admin
          </h1>
          <p className="text-sm text-[#64748b]">System dashboard</p>
        </div>
        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
          {process.env.NODE_ENV === "production" ? "PRODUCTION" : "DEVELOPMENT"}
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={() => { setError(null); setLoading(true); fetchData(); }}
            className="text-xs text-red-600 font-medium hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#e2e8f0] rounded-lg p-4 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-20 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-2 bg-gray-200 rounded w-24" />
            </div>
          ))
        ) : data ? (
          <>
            <StatCard label="Total Analyses" value={data.stats.totalAnalyses} color="#0ea5e9" sub={`+${data.stats.todayCount} today`} />
            <StatCard label="Success Rate" value={`${data.stats.successRate}%`} color="#16a34a" sub="completed / total" />
            <StatCard label="Avg Score" value={data.stats.avgScore} color="#ca8a04" sub="across all analyses" />
            <StatCard label="Scrape Rate" value={`${data.stats.scrapeSuccessRate}%`} color={data.stats.scrapeSuccessRate > 50 ? "#16a34a" : "#dc2626"} sub={data.stats.scrapeSuccessRate === 0 ? "DataDome blocking" : "success rate"} />
            <StatCard label="Cache Entries" value={data.stats.cacheEntries} color="#9333ea" sub="scraped pages cached" />
          </>
        ) : null}
      </div>

      {/* Tabbed Panel */}
      <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-[#e2e8f0]">
          {(["analyses", "scraping", "api"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "text-[#0ea5e9] border-[#0ea5e9]"
                  : "text-[#94a3b8] border-transparent hover:text-[#64748b]"
              }`}
            >
              {t === "analyses" ? "Analyses" : t === "scraping" ? "Scraping Health" : "API Usage"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "analyses" && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 p-4 border-b border-[#f1f5f9] items-center">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md px-3 py-1.5 text-xs text-[#64748b]"
              >
                <option value="all">Status: All</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="processing">Processing</option>
              </select>
              <select
                value={dataSourceFilter}
                onChange={(e) => { setDataSourceFilter(e.target.value); setPage(1); }}
                className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md px-3 py-1.5 text-xs text-[#64748b]"
              >
                <option value="all">Data Source: All</option>
                <option value="api+scrape">api+scrape</option>
                <option value="api-only">api-only</option>
              </select>
              <input
                type="text"
                placeholder="Search product code..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="ml-auto bg-[#f8fafc] border border-[#e2e8f0] rounded-md px-3 py-1.5 text-xs text-[#64748b] min-w-[200px]"
              />
            </div>

            {/* Table */}
            {loading ? (
              <div className="p-8 text-center text-sm text-[#94a3b8]">Loading...</div>
            ) : !data || data.analyses.items.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#94a3b8]">No analyses yet</div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#f1f5f9]">
                      <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">Product</th>
                      <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">Score</th>
                      <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">Status</th>
                      <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">Data Source</th>
                      <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">Competitors</th>
                      <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.analyses.items.map((item) => (
                      <Fragment key={item.id}>
                        <tr
                          onClick={() => fetchDetail(item.id)}
                          className="hover:bg-[#f8fafc] cursor-pointer border-b border-[#f8fafc]"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-sm text-[#0f172a]">{item.productTitle || "Untitled"}</div>
                            <div className="text-[11px] text-[#94a3b8] font-mono">{item.viatorProductCode}</div>
                          </td>
                          <td className="text-center px-4 py-3">
                            {item.overallScore !== null ? (
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-bold ${scoreBg(item.overallScore)}`}>
                                {item.overallScore}
                              </span>
                            ) : (
                              <span className="text-[#cbd5e1]">&mdash;</span>
                            )}
                          </td>
                          <td className="text-center px-4 py-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusBadge(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="text-center px-4 py-3">
                            {item.dataSource ? (
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${dataSourceBadge(item.dataSource)}`}>
                                {item.dataSource}
                              </span>
                            ) : (
                              <span className="text-[#cbd5e1]">&mdash;</span>
                            )}
                          </td>
                          <td className="text-center px-4 py-3 text-sm text-[#64748b]">{item.competitorCount}</td>
                          <td className="text-right px-4 py-3 text-xs text-[#94a3b8]">{timeAgo(item.createdAt)}</td>
                        </tr>
                        {expandedId === item.id && (
                          <tr>
                            <td colSpan={6} className="p-0">
                              <DetailPanel detail={detail} loading={detailLoading} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="text-center py-3 border-t border-[#f1f5f9] text-xs text-[#94a3b8]">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-[#0ea5e9] disabled:text-[#cbd5e1] mr-2"
                  >
                    &larr; Previous
                  </button>
                  Page {page} of {totalPages}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="text-[#0ea5e9] disabled:text-[#cbd5e1] ml-2"
                  >
                    Next &rarr;
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "scraping" && data && (
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MiniCard label="Total Attempts" value={data.events.scraping.totalAttempts} />
              <MiniCard label="Successes" value={data.events.scraping.successCount} color="#16a34a" />
              <MiniCard label="DataDome Blocks" value={data.events.scraping.blockedCount} color="#dc2626" />
              <MiniCard label="Cache Hits" value={data.events.scraping.cacheHitCount} color="#9333ea" />
            </div>
            {data.events.scraping.recentEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#94a3b8]">No scraping events recorded</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#f1f5f9]">
                    <th className="text-left px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">Time</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">Event</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">URL</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.scraping.recentEvents.map((ev) => (
                    <tr key={ev.id} className="border-b border-[#f8fafc] text-xs">
                      <td className="px-3 py-2 text-[#94a3b8]">{timeAgo(ev.createdAt)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          ev.event === "scrape_success" ? "bg-green-50 text-green-600" :
                          ev.event === "scrape_blocked" ? "bg-red-50 text-red-600" :
                          "bg-purple-50 text-purple-600"
                        }`}>
                          {ev.event.replace("scrape_", "")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#64748b] truncate max-w-[300px]">{(ev.metadata?.url as string) || "—"}</td>
                      <td className="px-3 py-2 text-right text-[#94a3b8]">
                        {ev.metadata?.durationMs ? `${ev.metadata.durationMs}ms` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "api" && data && (
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MiniCard label="Viator Today" value={data.events.api.viatorCallsToday} />
              <MiniCard label="Viator Total" value={data.events.api.viatorCallsTotal} />
              <MiniCard label="Anthropic Today" value={data.events.api.anthropicCallsToday} color="#ca8a04" />
              <MiniCard label="Anthropic Total" value={data.events.api.anthropicCallsTotal} color="#ca8a04" />
            </div>
            {data.events.api.recentEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#94a3b8]">No API calls recorded</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#f1f5f9]">
                    <th className="text-left px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">Time</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">Service</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">Endpoint</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.api.recentEvents.map((ev) => (
                    <tr key={ev.id} className="border-b border-[#f8fafc] text-xs">
                      <td className="px-3 py-2 text-[#94a3b8]">{timeAgo(ev.createdAt)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          ev.metadata?.service === "viator" ? "bg-blue-50 text-blue-600" : "bg-yellow-50 text-yellow-700"
                        }`}>
                          {(ev.metadata?.service as string) || "unknown"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#64748b]">{(ev.metadata?.endpoint as string) || "—"}</td>
                      <td className="px-3 py-2 text-right text-[#94a3b8]">
                        {ev.metadata?.durationMs ? `${ev.metadata.durationMs}ms` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub: string }) {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 text-center shadow-sm">
      <div className="text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">{label}</div>
      <div className="text-3xl font-bold my-1" style={{ color }}>{value}</div>
      <div className="text-[11px] text-[#94a3b8]">{sub}</div>
    </div>
  );
}

function MiniCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-[#94a3b8] font-medium">{label}</div>
      <div className="text-xl font-bold mt-1" style={{ color: color || "#334155" }}>{value}</div>
    </div>
  );
}

function DetailPanel({ detail, loading }: { detail: AnalysisDetail | null; loading: boolean }) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  if (loading) {
    return <div className="p-6 bg-[#f8fafc] text-center text-sm text-[#94a3b8]">Loading detail...</div>;
  }

  if (!detail) {
    return <div className="p-6 bg-[#f8fafc] text-center text-sm text-red-500">Failed to load detail</div>;
  }

  const categories = ["title", "description", "pricing", "reviews", "photos", "completeness"] as const;

  return (
    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg m-3 p-5">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-base font-semibold text-[#0f172a]">{detail.productTitle || "Untitled"}</h3>
          <p className="text-[11px] text-[#94a3b8] font-mono mt-0.5">
            ID: {detail.id.slice(0, 18)} &bull; Code: {detail.viatorProductCode}
          </p>
        </div>
        <a
          href={`/report/${detail.id}`}
          target="_blank"
          className="text-xs text-[#0ea5e9] hover:underline"
        >
          View Report &rarr;
        </a>
      </div>

      {/* Scores grid */}
      {detail.scores && (
        <div className="grid grid-cols-7 gap-2 mb-4">
          <div className="text-center p-2.5 bg-white border border-[#e2e8f0] rounded-md">
            <div className="text-[10px] text-[#94a3b8]">Overall</div>
            <div className={`text-lg font-bold ${scoreColor(detail.overallScore)}`}>{detail.overallScore ?? "—"}</div>
          </div>
          {categories.map((cat) => (
            <div key={cat} className="text-center p-2.5 bg-white border border-[#e2e8f0] rounded-md">
              <div className="text-[10px] text-[#94a3b8] capitalize">{cat}</div>
              <div className={`text-lg font-bold ${scoreColor(detail.scores![cat])}`}>{detail.scores![cat]}</div>
            </div>
          ))}
        </div>
      )}

      {/* Expandable sections */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: "productData", label: "Product Data (JSON)", desc: `dataSource: ${detail.dataSource || "api-only"}` },
          { key: "competitorsData", label: `Competitors (${(detail.competitorsData || []).length})`, desc: "Competitor details" },
          { key: "recommendations", label: `Recommendations (${(detail.recommendations || []).length})`, desc: "AI-generated recommendations" },
          { key: "reviewInsights", label: "Review Insights", desc: "Sentiment analysis" },
        ].map(({ key, label, desc }) => (
          <div key={key}>
            <button
              onClick={() => setOpenSection(openSection === key ? null : key)}
              className="w-full text-left bg-white border border-[#e2e8f0] rounded-md p-3 hover:border-[#cbd5e1] transition-colors"
            >
              <div className="text-xs font-semibold text-[#334155]">
                {openSection === key ? "▼" : "▶"} {label}
              </div>
              <div className="text-[11px] text-[#94a3b8] mt-0.5">{desc}</div>
            </button>
            {openSection === key && (
              <pre className="mt-1 p-3 bg-white border border-[#e2e8f0] rounded-md text-[11px] text-[#64748b] overflow-auto max-h-[400px] font-mono">
                {JSON.stringify(detail[key as keyof AnalysisDetail], null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Chunk 5: Verification & Build

### Task 12: Verify build

- [ ] **Step 1: Run linter**

Run: `npm run lint`
Expected: No errors related to new/modified files.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Manual verification**

1. Set `ADMIN_SECRET=test123` in `.env.local`
2. Run `npm run dev`
3. Visit `http://localhost:3000/admin` — should redirect to `/`
4. Visit `http://localhost:3000/admin?key=test123` — should set cookie, redirect to `/admin`, show dashboard with empty state
5. Run an analysis via the main app
6. Refresh admin dashboard — should show the analysis in the table with event data
7. Click on the analysis row — should expand and show detail panel with scores
8. Switch to "Scraping Health" tab — should show scraping events
9. Switch to "API Usage" tab — should show Viator and Anthropic API calls
10. Visit `http://localhost:3000/api/admin/stats` in an incognito window — should return 401

- [ ] **Step 4: Push schema to database**

If not done in Task 1:
Run: `npm run db:push`
