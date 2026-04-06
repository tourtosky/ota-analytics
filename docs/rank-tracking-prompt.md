# Claude Code Prompt: Rank Tracking Feature

## Context

You are working in the TourBoost repo (Next.js 16 App Router + TypeScript + Drizzle + PostgreSQL + Supabase Auth). Read `CLAUDE.md` at the repo root before starting — it documents the full tech stack, project structure, scoring system, and coding conventions. Follow them strictly.

Relevant existing modules you MUST reuse (do not reinvent):

- `lib/viator/client.ts` — authenticated Viator API wrapper (`viatorRequest`)
- `lib/viator/products.ts` — `fetchProduct`, `searchCompetitors`, `fetchProductsBulk`
- `lib/viator/types.ts` — `ViatorProduct` already contains `destinations[]` and `tags[]`
- `lib/scraping/utils/browser.ts` — `fetchPageHtml` (ZenRows-backed)
- `lib/scraping/utils/retry.ts` — `withRetry`, `NonRetryableError`
- `lib/scraping/utils/cache.ts` — `scraped_pages` table + helpers
- `lib/scraping/viator/scraper.ts` + `selectors.ts` — existing product-page scraper patterns (cheerio, JSON-LD, DataDome detection)
- `lib/db/schema.ts` — Drizzle schema; add new tables here
- `lib/plan-features.ts` + `lib/plans.ts` — plan-based gating
- `lib/admin/events.ts` — `logAdminEvent` for observability

## Goal

Build a **Listing Discovery + Rank Tracking** feature for TourBoost.

A Viator listing URL has the format `https://www.viator.com/{DestinationSlug}-tours/{CategorySlug}/d{destId}-tag{tagId}` (e.g. `https://www.viator.com/Amsterdam-tours/Canal-Cruises/d525-tag21709`). A single tour appears on many such listings (one per `destination × tag` combination).

Users need to:

1. See, in every report, the full list of public Viator listings (category pages) on which their tour potentially appears.
2. Click "Track" next to any listing to start tracking their tour's ranking on that category page over time.
3. View all tracked listings in a dedicated "Rank Tracking" section with current positions and historical trend charts.

Rankings are obtained by scraping the public category page via the existing ZenRows-backed scraping layer, because the Viator API's default sort does NOT match the public page order.

## Deliver in three stages — commit and get user approval between stages.

---

### Stage 1 — Listing Discovery (no scraping yet)

**1.1 — Extend types and DB.**
- Add a new interface `DiscoveredListing` in `lib/viator/types.ts`:
  ```ts
  export interface DiscoveredListing {
    destinationId: string;
    destinationName: string;
    destinationSlug: string;      // e.g. "Amsterdam"
    tagId: string;
    tagName: string;
    tagSlug: string;              // e.g. "Canal-Cruises"
    url: string;                  // canonical category URL
    verified: boolean;            // true if product was found in /products/search for this combo
    totalInListing?: number;      // total products in the category (from search response)
  }
  ```
- Add an `analyses.listings` column: `jsonb` typed as `DiscoveredListing[]`. Create a Drizzle migration via `npm run db:generate` and document the SQL.

**1.2 — Taxonomy helpers.** Create `lib/viator/taxonomy.ts` with:
- `getDestinationById(id: string): Promise<{ name, slug } | null>` — calls `/destinations` once, caches in-memory for the process lifetime.
- `getTagById(id: string): Promise<{ name, slug } | null>` — calls `/products/tags` once, cached similarly.
- `slugify(name: string): string` — produces Viator-style URL slugs (PascalCase-ish with hyphens — study how `d525-tag21709` maps to `Amsterdam-tours/Canal-Cruises`). If precise slug cannot be derived, use a placeholder slug — Viator redirects any slug to canonical as long as `d{destId}-tag{tagId}` is correct.

**1.3 — Discovery function.** In `lib/viator/products.ts` add:
```ts
export async function discoverListings(product: ViatorProduct): Promise<DiscoveredListing[]>
```
Logic:
1. Compute cartesian product of `product.destinations × product.tags`. Handle the `ViatorTag` union type (number or `{ref, name}`).
2. For each combo, call `/products/search` with `{ filtering: { destination, tags: [tagId] }, pagination: { offset: 0, limit: 50 } }` and check whether `product.productCode` is in the results. Set `verified` accordingly and capture `totalCount` from the response.
3. Resolve destination and tag names via `taxonomy.ts`.
4. Build the canonical URL.
5. Run verification calls with concurrency limited to 4 (use `p-limit` — add as dep if not present). Cap total listings at 30 (sort verified-first, truncate rest).
6. Never throw — if a verification fails, log via `logAdminEvent("listing_verify_failed", {...})` and mark `verified: false`.

**1.4 — Integrate into analysis pipeline.** In the async processor (find it in `app/api/analyze/route.ts` — it's called `processAnalysis` or similar), after competitors are fetched, call `discoverListings(product)` in parallel with the Claude calls (`Promise.all`) and persist to `analyses.listings`. Add a `progress` step so the polling UI shows it.

**1.5 — UI.** Create `components/ListingsOverview.tsx`:
- Glassmorphism card (`.glass` class) matching existing components.
- Table / list of listings with columns: Destination, Category, Verified badge, "Total products" count, external link icon → opens listing, "Track" button.
- For Stage 1, the "Track" button is disabled with tooltip "Coming soon — Stage 2".
- Use Framer Motion entrance animations consistent with other report components.
- Render it on `app/report/[id]/page.tsx` below `CompetitorTable`.

**1.6 — Tests / verification.** Run `npm run lint` and `npm run build`. Manually test one analysis end-to-end via browser. Commit with message `feat(listings): discover viator listings per product`.

---

### Stage 2 — Rank Tracking Core (API-based, no scraping)

**Important architectural note.** The original plan was to scrape public Viator category pages via ZenRows for pixel-perfect ranks. **ZenRows is paused for cost reasons** and scraping is explicitly out of scope for Stages 2 and 3. Instead, rank tracking is built entirely on top of the **Viator Partner API `/products/search` endpoint with `sortOrder: DEFAULT`**.

Why this works:
- Viator's `DEFAULT` sort is the same "featured" ranking used on public category pages — based on product quality, reviews, ratings, photos, popularity, price, bookings, and operator payments.
- It is an **approximation** of the public page order, not identical. Differences come from availability windows, geo personalization, language, and fronted A/B tests.
- For this product's needs (trend tracking, drop alerts, competitor comparison) the approximation is more than sufficient and costs nothing beyond existing Viator API usage.
- The UI MUST clearly label this as an "Estimated rank" to set correct expectations. See 2.6.

A future Stage 4 can add pixel-perfect scraping via ZenRows if and when it is reactivated. Do not build it now. Do not design around it.

**2.1 — DB migration.** Add two tables to `lib/db/schema.ts`:

```ts
export const trackedListings = pgTable("tracked_listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  productCode: varchar("product_code", { length: 20 }).notNull(),
  productTitle: text("product_title"),
  destinationId: varchar("destination_id", { length: 16 }).notNull(),
  destinationName: text("destination_name"),
  tagId: varchar("tag_id", { length: 16 }).notNull(),
  tagName: text("tag_name"),
  listingUrl: text("listing_url").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastCheckedAt: timestamp("last_checked_at"),
}, (t) => [
  uniqueIndex("tracked_listings_unique_combo").on(
    t.userId, t.productCode, t.destinationId, t.tagId
  ),
  index("tracked_listings_user_active_idx").on(t.userId, t.isActive),
]);

export const rankSnapshots = pgTable("rank_snapshots", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  trackedListingId: uuid("tracked_listing_id").notNull().references(() => trackedListings.id, { onDelete: "cascade" }),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
  position: integer("position"),              // null = not found in scanned pages
  page: integer("page"),                      // which API page the match was found on (0-indexed)
  totalResults: integer("total_results"),     // response.totalCount
  pagesScanned: integer("pages_scanned"),
  source: varchar("source", { length: 20 }).notNull(),  // "viator_api"
  sortOrder: varchar("sort_order", { length: 20 }).notNull(), // "DEFAULT"
  neighbors: jsonb("neighbors").$type<Array<{ position: number; productCode: string; title?: string }>>(),
  error: text("error"),
}, (t) => [
  index("rank_snapshots_listing_checked_idx").on(t.trackedListingId, t.checkedAt.desc()),
]);
```

Run `npm run db:generate`, review generated SQL, then `npm run db:push`. Export types.

**2.2 — Rank finder (API-based).** Create `lib/rank-tracking/rank-finder.ts`:

```ts
export interface RankResult {
  position: number | null;           // 1-indexed, null if not found
  page: number | null;               // 0-indexed API page where found
  totalResults: number;              // response.totalCount from first page
  pagesScanned: number;
  neighbors: Array<{ position: number; productCode: string; title?: string }>;
  sortOrder: "DEFAULT";
}

export async function findProductRankViaApi(
  productCode: string,
  destinationId: string,
  tagId: string,
  opts?: { pageSize?: number; maxPages?: number }
): Promise<RankResult>;
```

Implementation notes:
- Default `pageSize = 50`, `maxPages = 4` (= top 200). Make configurable for future-proofing.
- Reuse `viatorRequest` from `lib/viator/client.ts`. Do NOT create a parallel HTTP client.
- Request body shape (verify exact field names against the current `ViatorProductSearchResponse` type and Viator docs — this is the contract per spec snippets but must be confirmed by a tiny live call before wiring everything up):
  ```ts
  {
    filtering: { destination: destinationId, tags: [Number(tagId)] },
    sorting: { sort: "DEFAULT" },
    currency: "USD",
    pagination: { offset: page * pageSize, limit: pageSize },
  }
  ```
- Loop pages `0..maxPages-1`. On each response:
  1. Record `totalResults` from `response.totalCount` on first page.
  2. `findIndex` for our `productCode`. If found → `position = page * pageSize + idx + 1`, capture 5 neighbors above + 5 below from the combined scanned window, return.
  3. If `response.products.length < pageSize` → end of list, break and return `position: null`.
- On API error: let it throw — the caller will catch and record `error` in the snapshot. Do NOT swallow.
- Log via `logAdminEvent("rank_check", { productCode, destinationId, tagId, position, pagesScanned, totalResults, durationMs })`.
- **Validation spike (first thing in Stage 2, before any other code):** write a one-off script `scripts/test-rank-api.ts` that calls `findProductRankViaApi` for a known product (read `VIATOR_TEST_PRODUCT_CODE` from env, or hard-code the one from the user's Amsterdam Canal Cruises example). Print the result. Confirm `sort: "DEFAULT"` is the correct field name — if the API rejects it, try `sortOrder: "DEFAULT"` and update all call sites. **STOP and report if the spike fails** — everything downstream depends on it.

**2.3 — Service layer.** Create `lib/rank-tracking/service.ts` with:
- `createTrackedListing(userId, listing: DiscoveredListing, productCode, productTitle)` — enforce plan quota (see 2.5). Dedupe via unique index — on conflict return the existing record.
- `listTrackedListings(userId)` — returns tracked listings joined with the most recent `rank_snapshot` per listing (use a lateral join or subquery).
- `deleteTrackedListing(userId, id)` — hard delete (cascade removes snapshots). Owner check required.
- `runRankCheck(trackedListingId)` — calls `findProductRankViaApi`, writes snapshot, updates `lastCheckedAt`. Wrap in try/catch: on failure still insert a snapshot row with `error` populated and `position: null`, so history stays consistent. Must be idempotent — use an advisory lock or a `lastCheckedAt > now() - interval '1 minute'` guard to prevent double-checks from racing cron + manual clicks.
- `getRankHistory(trackedListingId, days = 30)` — ordered time series for charts.

**2.4 — API routes.** Create under `app/api/rank-tracking/`:
- `POST /api/rank-tracking` — body `{ analysisId, listing: DiscoveredListing }`, auth required, returns created record. Immediately fire-and-forget `runRankCheck` so the first snapshot exists within seconds (no waiting on cron).
- `GET /api/rank-tracking` — list current user's tracked listings with latest snapshot.
- `DELETE /api/rank-tracking/[id]` — delete one. Owner check.
- `POST /api/rank-tracking/[id]/check` — on-demand rank check. Rate limit: at most once per 1 hour per listing for growth, once per 15 minutes for pro, blocked for free. Returns fresh snapshot.
- `GET /api/rank-tracking/[id]/history?days=30` — time series. Clamp `days` to the user's plan window.

All routes use the existing Supabase auth helper pattern (study `app/api/dashboard/analyses/route.ts`). Return appropriate status codes, JSON errors.

**2.5 — Plan gating.** Extend `lib/plans.ts` (`PLAN_LIMITS`) with rank-tracking quotas, and add user-facing copy to `lib/plan-features.ts`:
- `free`: 0 tracked listings
- `growth`: 10 tracked listings, 1 auto-check/day, 7-day history window
- `pro`: 50 tracked listings, 4 auto-checks/day, 90-day history window

Expose helpers `getRankTrackingQuota(plan)` and `canAddTrackedListing(userId)`. Enforce on every write path server-side.

**2.6 — UI.**
- Activate the "Track" button in `ListingsOverview.tsx`. Clicked → POST to `/api/rank-tracking`, show toast, swap button to "Tracking ✓" linking to `/rank-tracking`. If quota exceeded → toast with upgrade CTA.
- New page `app/rank-tracking/page.tsx`:
  - Server component: auth check, redirect to `/login` if no user.
  - Client component `components/RankTrackingTable.tsx`. Columns: Product, Listing (external link), **Estimated position** (with a small info tooltip: *"Based on Viator's DEFAULT featured sort via the Partner API. Closely approximates the public category page but may differ slightly due to personalization and availability filters."*), 7-day delta arrow, sparkline (`recharts` LineChart mini, add `recharts` as dep here), Last checked (relative time), actions (Check now, Remove).
  - Row click → modal with full `recharts` history chart + neighbors list from latest snapshot ("Products ranked around yours").
- Add "Rank Tracking" link to the main dashboard nav.
- **Copy rule:** Every place the UI shows a rank, the label must be "Estimated position" or "Est. rank" — never a bare "Position" — until a pixel-perfect source (Stage 4) is available.

**2.7 — Verification.** Before committing:
- `npm run lint` and `npm run build` clean.
- The `scripts/test-rank-api.ts` spike from 2.2 must pass end-to-end and be committed so it can be re-run.
- Add a second script `scripts/test-rank-tracking-e2e.ts` that (a) creates a tracked listing in the DB for a seeded test user, (b) runs `runRankCheck`, (c) prints the resulting snapshot, (d) calls `getRankHistory`. Guard with an env flag so it doesn't run in CI.
- Manually verify one full cycle in the browser: open a report → click Track on a listing → visit `/rank-tracking` → see the listing with a position → click "Check now" → see an updated snapshot → open history modal.

Commit: `feat(rank-tracking): api-based rank tracking core`.

---

### Stage 3 — Automation + Polish

**3.1 — Cron.** Add `app/api/cron/rank-check/route.ts`:
- Auth via `CRON_SECRET` header.
- Fetch all `isActive` tracked listings where `lastCheckedAt` is older than the user's plan cadence.
- Run checks with `p-limit(4)` concurrency (Viator API is fast and free — concurrency can be higher than scraping would allow, but keep it polite).
- Each failure is logged and written as an `error` snapshot, but does not abort the batch.
- Configure Vercel cron in `vercel.json`: `{"crons":[{"path":"/api/cron/rank-check","schedule":"0 6 * * *"}]}`.

**3.2 — History chart.** Full `recharts` LineChart in the modal from 2.6 with plan-based day range. Annotate significant drops (>5 positions) visually. Gracefully render gaps where snapshots have `position: null`.

**3.3 — Drop alerts.** When a new snapshot drops > 5 positions vs 7-day average, insert an in-app notification (create a `notifications` table). Optional: email via existing mailer.

**3.4 — Admin observability.** Surface in `app/admin/` a small dashboard with counts: total tracked listings, rank checks in last 24h, API success rate, average checks-per-listing-per-day, top users by tracked-listing count. Use `admin_events` as source.

**3.5 — Docs.** Update `CLAUDE.md` with the new tables, routes, data flow, and the explicit note that rank tracking is API-based (DEFAULT sort) and labeled "Estimated position" in the UI.

Commit: `feat(rank-tracking): automation, history, alerts`.

---

### Stage 4 — Pixel-perfect rank via scraping (DEFERRED, do not build now)

Out of scope until ZenRows (or an alternative) is reactivated by the user. When that happens, this stage would add a second `source` to `rank_snapshots` (`"zenrows"` or similar), scrape the public category page through `lib/scraping/utils/browser.ts`, and let pro users opt into "exact rank" alongside the API estimate. The existing schema and UI are already forward-compatible (`source` and `sortOrder` columns exist on snapshots; the UI label is "Estimated position" only until a verified source is available). Do not write code for this stage in the current pass.

---

## Hard rules

1. **No scraping in Stages 1–3.** Rank data comes exclusively from the Viator Partner API via `viatorRequest`. Do not import from `lib/scraping/*` in any new rank-tracking code. ZenRows is paused.
2. **Never fake results.** If a rank check fails, record `error` in the snapshot and set `position: null`. Do not invent a position. Do not fall back to a guess.
3. **Always label rank as "Estimated"** in the UI until a pixel-perfect source exists (Stage 4). Any PR that shows a bare "Position" label should be rejected in self-review.
4. **Respect plan quotas** on every write path — server-side, not just UI.
5. **Use the `@/` path alias** for all imports.
6. **All Drizzle schema changes** go through `npm run db:generate` + migration review. Do not hand-edit generated SQL.
7. **Idempotency** — `createTrackedListing` and `runRankCheck` must be safe to retry. Use a short `lastCheckedAt` guard or advisory lock so cron + manual clicks cannot double-check a listing within a 60-second window.
8. **Observability** — log `admin_events` for every tracked listing created, every rank check attempt (success or failure), and every quota denial.
9. **TypeScript strict mode** — no `any`, no `@ts-ignore` unless justified by a comment.
10. **Small, reviewable commits** — one per stage minimum, ideally per 2.x sub-stage.

## Before you start

1. Read `CLAUDE.md`, `lib/viator/client.ts`, `lib/viator/products.ts`, `lib/viator/types.ts`, `lib/db/schema.ts`, `lib/plans.ts`, `lib/plan-features.ts`, `app/api/analyze/route.ts`, `app/api/dashboard/analyses/route.ts`, and `app/report/[id]/page.tsx` end-to-end. You do NOT need to read `lib/scraping/*` for this feature.
2. Stage 1 is fully unblocked — no external dependency. Start there.
3. **Before writing any Stage 2 code**, do the tiny API spike described in 2.2: call `/products/search` with `sorting: { sort: "DEFAULT" }` and `filtering: { destination: "525", tags: [21709] }` for a known Amsterdam Canal Cruises product. Verify (a) the exact field name for the DEFAULT sort option, (b) that `response.totalCount` exists, (c) that `pagination.limit: 50` is accepted. If any of these are wrong, STOP and report before proceeding.
4. Present a short execution plan before writing code. Wait for approval.

When ready, begin with Stage 1.
