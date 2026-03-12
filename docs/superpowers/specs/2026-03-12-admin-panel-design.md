# Admin Panel Design Spec

**Goal:** Add an admin dashboard to TourBoost that provides full visibility into analyses, scraping health, and API usage. Single-page layout with tabs, protected by an env var secret.

**Scope:** Admin-only panel for the system operator. No user accounts, no multi-tenant features.

---

## 1. Database Changes

### 1.1 Add `data_source` column to `analyses`

- Drizzle field: `dataSource`, DB column: `data_source` — `varchar(20)`, nullable (follows existing snake_case convention)
- Values: `"api+scrape"` | `"api-only"`
- Populated in `processAnalysis()` from `mergedProduct.dataSource`
- Enables fast filtering/aggregation without JSONB queries
- Existing rows will have `null` (treated as `"api-only"` in queries)

### 1.2 New `admin_events` table

| Column | Type | Notes |
|--------|------|-------|
| id | serial | PK, auto-increment |
| event | varchar(50) | Event type (see below) |
| metadata | jsonb | Event-specific data |
| createdAt | timestamp | Auto-set, default `now()` |

**Indexes:** Composite index on `(event, createdAt)` for aggregate queries.

**Retention:** Events older than 90 days may be pruned. Queries should use `LIMIT` and filter by `createdAt` range.

**Event types:**
- `analysis_started` — metadata: `{ productCode, analysisId }`
- `analysis_completed` — metadata: `{ analysisId, score, dataSource, durationMs }`
- `analysis_failed` — metadata: `{ analysisId, error }`
- `scrape_success` — metadata: `{ url, productCode, durationMs }`
- `scrape_blocked` — metadata: `{ url, reason: "DataDome" }`
- `scrape_cache_hit` — metadata: `{ url, productCode }`
- `api_call` — metadata: `{ service: "viator"|"anthropic", endpoint, durationMs }`

### 1.3 Event logging utility

**File:** `lib/admin/events.ts`

```typescript
export function logAdminEvent(event: string, metadata: Record<string, unknown>): void
```

- Fire-and-forget: inserts into `admin_events`, catches errors silently
- Never blocks the pipeline — no `await` at call sites
- Called from `processAnalysis()`, `ViatorScraper.scrape()`, and API client wrappers

---

## 2. Auth & Routing

### 2.1 Access control

- **Middleware** at `middleware.ts` intercepts all `/admin` and `/api/admin` routes
- On first visit with `?key=` param: validates against `ADMIN_SECRET`, sets `httpOnly` cookie (`admin_token=<secret>`), redirects to clean URL without key in query string
- Subsequent requests: middleware checks the cookie — no key needed in URL
- API routes check the same cookie (sent automatically by browser fetch calls from the admin page)
- No match → redirect to `/` (for pages) or 401 JSON (for API routes)
- **Edge runtime safe:** Middleware only reads `process.env.ADMIN_SECRET` and checks cookie/query param — no DB imports, no Drizzle. All DB queries happen in API route handlers only.

### 2.2 New env var

```
ADMIN_SECRET=<random-string>
```

Added to `.env.local` and `.env.local.example`.

### 2.3 Routes

| Route | Type | Purpose |
|-------|------|---------|
| `app/admin/page.tsx` | Page | Single-page admin dashboard |
| `app/api/admin/stats/route.ts` | API (GET) | Returns stats, paginated analyses, event aggregates |
| `app/api/admin/analysis/[id]/route.ts` | API (GET) | Returns full detail for one analysis |

---

## 3. API Endpoints

### 3.1 `GET /api/admin/stats`

**Query params:**
- `page` — page number (default 1)
- `status` — filter: `all` | `completed` | `failed` | `processing`
- `dataSource` — filter: `all` | `api+scrape` | `api-only`
- `search` — product code search string

Auth via `admin_token` cookie (no `key` param needed after initial login).

**Response:**
```json
{
  "stats": {
    "totalAnalyses": 847,
    "completedCount": 796,
    "failedCount": 51,
    "successRate": 94,
    "avgScore": 62,
    "todayCount": 12,
    "scrapeSuccessRate": 0,
    "cacheEntries": 23
  },
  "analyses": {
    "items": [
      {
        "id": "uuid",
        "viatorProductCode": "116901P15",
        "productTitle": "Traditional Fishing Experience",
        "status": "completed",
        "overallScore": 67,
        "dataSource": "api-only",
        "competitorCount": 3,
        "createdAt": "2026-03-12T...",
        "completedAt": "2026-03-12T..."
      }
    ],
    "total": 847,
    "page": 1,
    "pageSize": 20
  },
  "events": {
    "scraping": {
      "totalAttempts": 120,
      "successCount": 0,
      "blockedCount": 120,
      "cacheHitCount": 23,
      "recentEvents": [...]
    },
    "api": {
      "viatorCallsToday": 45,
      "viatorCallsTotal": 3200,
      "anthropicCallsToday": 12,
      "anthropicCallsTotal": 800,
      "recentEvents": [...]
    }
  }
}
```

Always returns the full response (stats + analyses + all event aggregates). The data volume is small enough that splitting by tab is unnecessary.

**Note:** `competitorCount` is derived via `jsonb_array_length(competitors_data)` in the SQL query using Drizzle's `sql` template literal — no extra column needed.

### 3.2 `GET /api/admin/analysis/[id]`

**Auth:** Via `admin_token` cookie.

**Response:** Full analysis row including all JSONB fields (productData, competitorsData, recommendations, reviewInsights).

---

## 4. Frontend: Admin Page

### 4.1 Layout

Single `"use client"` page at `app/admin/page.tsx`.

**Structure:**
1. Header: "TourBoost Admin" logo + environment badge
2. Stats row: 5 cards (always visible)
3. Tab bar: Analyses | Scraping Health | API Usage
4. Tab content area

### 4.2 Stats Cards

| Card | Color | Value | Subtext |
|------|-------|-------|---------|
| Total Analyses | Blue (#0ea5e9) | count | +N today |
| Success Rate | Green (#16a34a) | percentage | completed/total |
| Avg Score | Yellow (#ca8a04) | 0-100 | across all |
| Scrape Rate | Red/Green (#dc2626/#16a34a) | percentage | success/attempts |
| Cache Entries | Purple (#9333ea) | count | scraped pages |

### 4.3 Tab: Analyses (default)

**Filters:** Status dropdown, Data Source dropdown, Product code search input.

**Table columns:** Product (title + code), Score (color badge), Status (badge), Data Source (badge), Competitors (count), Created (relative time).

**Row expansion:** Click a row to expand inline detail panel:
- Score breakdown: 7 boxes (Overall + 6 categories), color-coded
- 4 collapsible sections: Product Data (JSON), Competitors, Recommendations, Review Insights
- Link to public report page

**Pagination:** 20 items per page, Previous/Next navigation.

### 4.4 Tab: Scraping Health

- 4 summary cards: Total attempts, Successes, DataDome blocks, Cache hit rate
- Recent events table: Timestamp, Event type, URL, Outcome, Duration
- Data sourced from `admin_events` where event starts with `scrape_`

### 4.5 Tab: API Usage

- 4 summary cards: Viator calls today/total, Anthropic calls today/total
- Recent events table: Timestamp, Service, Endpoint, Duration
- Data sourced from `admin_events` where event = `api_call`

### 4.6 States

- **Loading:** Skeleton placeholders for stats cards and table rows while API loads
- **Error:** Red banner at top with error message and "Retry" button
- **Empty:** Per-tab empty state messages ("No analyses yet", "No scraping events recorded", "No API calls recorded")

### 4.7 Styling

- **Light theme**: white `#f8fafc` background, `#fff` cards with `#e2e8f0` borders
- **Typography**: System font stack (matches existing Plus Jakarta Sans via Tailwind)
- **No glassmorphism** on admin — clean, functional design
- **Color-coded badges**: green (success/high score), yellow (medium), red (failed/low/blocked), blue (api+scrape), gray (neutral)
- **Tailwind utility classes** throughout — no custom CSS file needed

---

## 5. Pipeline Modifications

### 5.1 `app/api/analyze/route.ts`

Add event logging calls (fire-and-forget) at these points:
- After creating analysis record: `logAdminEvent("analysis_started", ...)`
- After merge step: populate `dataSource` column in final DB update
- On completion: `logAdminEvent("analysis_completed", ...)`
- On failure: `logAdminEvent("analysis_failed", ...)`

**Bug fix:** The existing `.catch()` handler in `processAnalysis` calls `db.update(...)` without `await`, so the status may never be set to `"failed"`. Add `await` to the DB update in the catch block, and place event logging inside the same block.

### 5.2 `lib/scraping/viator/scraper.ts`

Add event logging:
- On cache hit: `logAdminEvent("scrape_cache_hit", ...)`
- On successful scrape: `logAdminEvent("scrape_success", ...)`
- On DataDome block: `logAdminEvent("scrape_blocked", ...)`

### 5.3 `lib/viator/client.ts`

Add event logging wrapper:
- On each API call: `logAdminEvent("api_call", { service: "viator", endpoint, durationMs })`

### 5.4 `lib/analysis/recommendations.ts`

Add event logging:
- On each Claude API call: `logAdminEvent("api_call", { service: "anthropic", endpoint: "messages", durationMs })`

---

## 6. File Map

**New files:**
- `middleware.ts` — admin auth check
- `lib/admin/events.ts` — `logAdminEvent()` utility
- `app/admin/page.tsx` — admin dashboard page
- `app/api/admin/stats/route.ts` — stats + analyses list API
- `app/api/admin/analysis/[id]/route.ts` — single analysis detail API

**Modified files:**
- `lib/db/schema.ts` — add `dataSource` column to `analyses`, add `adminEvents` table
- `app/api/analyze/route.ts` — add event logging + populate `dataSource`
- `lib/scraping/viator/scraper.ts` — add scrape event logging
- `lib/viator/client.ts` — add API call event logging
- `lib/analysis/recommendations.ts` — add Anthropic API call logging
- `.env.local` / `.env.local.example` — add `ADMIN_SECRET`
