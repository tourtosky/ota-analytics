# Scraping Layer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a platform-agnostic Playwright-based web scraping layer to TourBoost that extracts full product content from Viator pages and merges it with API data before scoring.

**Architecture:** `lib/scraping/` at root level. `ViatorScraper` implements `PlatformScraper` interface; primary extraction via `__NEXT_DATA__` JSON, DOM fallback. `mergeProductData()` combines API + scrape into `MergedProduct` (extends `ViatorProduct`) which flows into existing scoring/AI functions unchanged.

**Tech Stack:** `playwright` (headless Chromium), `cheerio` (HTML parsing), Drizzle ORM for cache table, TypeScript strict.

**Note on testing:** This project has no test framework. Verification is done via manual API calls to a dedicated `GET /api/test-scraper` route created in Task 15, plus TypeScript compilation checks (`npm run build`).

---

## File Map

**New files:**
- `lib/scraping/types.ts` — `ScrapedListing`, `PlatformScraper`, `MergedProduct`, `ScraperResult`
- `lib/scraping/scraper-factory.ts` — `getScraperForUrl(url)` → `PlatformScraper`
- `lib/scraping/merge.ts` — `mergeProductData(api, scraped)` → `MergedProduct`
- `lib/scraping/viator/urls.ts` — `buildViatorUrl(destId, productCode)` → string
- `lib/scraping/viator/selectors.ts` — `NEXT_DATA_PATHS`, `SELECTORS` (verified against live page)
- `lib/scraping/viator/scraper.ts` — `ViatorScraper` class
- `lib/scraping/utils/anti-detect.ts` — UA pool, viewport pool, `applyStealthConfig(page)`
- `lib/scraping/utils/browser.ts` — `getBrowser()` / `closeBrowser()` singleton
- `lib/scraping/utils/cache.ts` — `getCachedListing()` / `setCachedListing()`
- `lib/scraping/utils/proxy.ts` — `getScrapingMode()` / `getProxyConfig()` stubs
- `lib/scraping/utils/retry.ts` — `withRetry(fn, options)`
- `app/api/test-scraper/route.ts` — manual test endpoint (delete after testing)

**Modified files:**
- `lib/db/schema.ts` — add `scrapedPages` table
- `lib/viator/types.ts` — add `destinationRef: string` to `CompetitorData`
- `lib/viator/products.ts` — populate `destinationRef` in `formatCompetitorData`
- `app/api/analyze/route.ts` — integrate scraping into `processAnalysis`

---

## Chunk 1: Foundation

### Task 1: Install Dependencies

**Files:** none (package.json + package-lock.json modified automatically)

- [ ] **Step 1: Install packages**

```bash
npm install playwright cheerio
```

Expected output: packages added without errors.

- [ ] **Step 2: Install Chromium browser**

```bash
npx playwright install chromium
```

Expected output: `Chromium X.X.X (playwright build vXXXX) downloaded to ...`

- [ ] **Step 3: Verify cheerio types are available**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Expected: no new errors related to cheerio (it ships its own types).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add playwright and cheerio dependencies"
```

---

### Task 2: Update `CompetitorData` Type

**Files:**
- Modify: `lib/viator/types.ts`
- Modify: `lib/viator/products.ts`

`CompetitorData` needs `destinationRef` so we can build Viator URLs for competitor scraping.

- [ ] **Step 1: Add `destinationRef` to `CompetitorData` in `lib/viator/types.ts`**

Find the `CompetitorData` interface (around line 173 in the file) and add the field:

```typescript
export interface CompetitorData {
  productCode: string;
  title: string;
  rating: number;
  reviewCount: number;
  price: number;
  currency: string;
  photoCount: number;
  flags?: string[];
  destinationRef: string;   // destination ref for URL construction
}
```

- [ ] **Step 2: Populate `destinationRef` in `formatCompetitorData` in `lib/viator/products.ts`**

In the `.map()` call inside `formatCompetitorData`, add `destinationRef`:

```typescript
const basicData = products
  .filter((product) => product.reviews && product.pricing)
  .map((product) => ({
    productCode: product.productCode,
    title: product.title || "Untitled",
    rating: product.reviews?.combinedAverageRating || 0,
    reviewCount: product.reviews?.totalReviews || 0,
    price: product.pricing?.summary?.fromPrice || 0,
    currency: product.pricing?.currency || "USD",
    photoCount: 0,
    flags: product.flags || [],
    destinationRef: product.destinations?.[0]?.ref ?? "",   // ADD THIS LINE
  }));
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep -E "error|warning" | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add lib/viator/types.ts lib/viator/products.ts
git commit -m "feat: add destinationRef to CompetitorData for URL construction"
```

---

### Task 3: Add `scrapedPages` DB Table

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add imports and table to `lib/db/schema.ts`**

At the top, the existing imports are already there (`pgTable`, `text`, `varchar`, `jsonb`, `timestamp`). Add the new table after the `analyses` table:

```typescript
export const scrapedPages = pgTable("scraped_pages", {
  url: text("url").primaryKey(),
  platform: varchar("platform", { length: 20 }).notNull(),
  html: text("html"),            // always NULL — reserved for future debug use
  parsedData: jsonb("parsed_data").notNull(),
  // NOTE: parsedData deliberately omits .$type<ScrapedListing>() to avoid a
  // dependency cycle: schema.ts → scraping/types.ts → lib/db/schema.ts.
  // The cache module (lib/scraping/utils/cache.ts) casts to ScrapedListing on read.
  scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});
```

- [ ] **Step 2: Generate migration**

```bash
npm run db:generate
```

Expected: creates a new file in `drizzle/` directory like `drizzle/0001_scraped_pages.sql`.

- [ ] **Step 3: Verify migration file was created**

```bash
ls drizzle/
```

Expected: shows the new migration SQL file.

- [ ] **Step 4: Apply migration**

```bash
npm run db:push
```

Expected: `scraped_pages` table created in PostgreSQL.

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat: add scraped_pages table for scraping cache"
```

---

### Task 4: Create Core Types

**Files:**
- Create: `lib/scraping/types.ts`

- [ ] **Step 1: Create directory and file**

```bash
mkdir -p lib/scraping/viator lib/scraping/utils
```

- [ ] **Step 2: Write `lib/scraping/types.ts`**

```typescript
import type { ViatorProduct } from "@/lib/viator/types";

export type Platform = "viator" | "getyourguide" | "klook" | "civitatis";

export interface ItineraryStop {
  type: "stop" | "pass-by";
  name: string;
  description: string;
  duration?: string;
}

export interface ScrapedListing {
  platform: Platform;
  url: string;
  productCode: string;

  // Content
  title: string;
  description: string;
  highlights: string[];
  itinerary: ItineraryStop[];
  inclusions: string[];
  exclusions: string[];

  // Metrics
  rating: number;
  reviewCount: number;
  price: {
    amount: number;
    currency: string;
    originalAmount?: number;
  };
  duration: string;

  // Media
  photoCount: number;
  photoUrls: string[];

  // Details
  cancellationPolicy: string;
  languages: string[];
  meetingPoint: string;
  groupSize?: string;
  accessibility?: string[];

  // Badges & flags
  flags: string[];
  badges: string[];

  // Operator
  operatorName: string;
  operatorResponseRate?: string;

  // Meta
  scrapedAt: Date;
  scrapeSuccess: boolean;
  scrapeErrors: string[];
}

export interface ScraperResult {
  listing: ScrapedListing | null;
  cached: boolean;
  error?: string;
}

export interface PlatformScraper {
  platform: Platform;
  canHandle(url: string): boolean;
  extractProductCode(url: string): string | null;
  scrape(url: string): Promise<ScraperResult>;
}

/**
 * MergedProduct extends ViatorProduct by ADDING fields only — no field type overrides.
 *
 * Design note: The spec proposed `extends Omit<ViatorProduct, 'cancellationPolicy'>` with
 * `cancellationPolicy: string`. That approach breaks TypeScript assignability —
 * `string` is not assignable to `ViatorCancellationPolicy | undefined`, so
 * `calculateScores(mergedProduct, ...)` would fail to compile.
 *
 * Instead, `cancellationPolicy` stays typed as `ViatorCancellationPolicy | undefined`.
 * The merge function wraps any scraped cancellation string as:
 *   { type: 'STANDARD', description: scrapedString }
 * This satisfies the existing type AND passes truthiness checks in the scoring engine.
 *
 * Result: MergedProduct IS-A ViatorProduct structurally — no casts needed anywhere.
 */
export interface MergedProduct extends ViatorProduct {
  highlights: string[];
  photoUrls: string[];
  badges: string[];
  meetingPoint: string;
  operatorName: string;
  groupSize?: string;
  dataSource: "api+scrape" | "api-only";
  incompleteFields: string[];
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "scraping" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/scraping/types.ts
git commit -m "feat: add scraping layer types (ScrapedListing, PlatformScraper, MergedProduct)"
```

---

## Chunk 2: Browser Infrastructure

### Task 5: URL Builder

**Files:**
- Create: `lib/scraping/viator/urls.ts`

- [ ] **Step 1: Write `lib/scraping/viator/urls.ts`**

```typescript
/**
 * Build a short-form Viator product URL from destination ref and product code.
 * Viator redirects this to the full canonical URL automatically.
 *
 * Example: buildViatorUrl("687", "5678P1")
 *   → "https://www.viator.com/tours/d687-5678P1"
 */
export function buildViatorUrl(
  destinationRef: string,
  productCode: string
): string {
  return `https://www.viator.com/tours/d${destinationRef}-${productCode}`;
}

/**
 * Extract product code from a Viator URL.
 * Handles both full and short-form URLs.
 *
 * Examples:
 *   "https://www.viator.com/tours/d687-5678P1" → "5678P1"
 *   "https://www.viator.com/tours/New-York/Tour/d687-5678P1" → "5678P1"
 */
export function extractViatorProductCode(url: string): string | null {
  // Require at least 4 alphanumeric chars after the dash to avoid false matches
  // on destination slugs. Viator codes are like "5678P1", "123ABC4", etc.
  const match = url.match(/d\d+-([A-Z0-9]{4,})/i);
  return match ? match[1].toUpperCase() : null;
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "urls" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add lib/scraping/viator/urls.ts
git commit -m "feat: add buildViatorUrl and extractViatorProductCode helpers"
```

---

### Task 6: Anti-Detection Config

**Files:**
- Create: `lib/scraping/utils/anti-detect.ts`

- [ ] **Step 1: Write `lib/scraping/utils/anti-detect.ts`**

```typescript
import type { Page } from "playwright";

export const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 OPR/117.0.0.0",
];

export const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1366, height: 768 },
];

export function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.floor(Math.random() * (maxMs - minMs));
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Apply stealth configuration to a Playwright page.
 * Must be called before page.goto().
 */
export async function applyStealthConfig(page: Page): Promise<void> {
  const userAgent = randomItem(USER_AGENTS);
  const viewport = randomItem(VIEWPORTS);

  await page.setViewportSize(viewport);
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  });

  // Must set UA via context or addInitScript for full effect
  await page.addInitScript(
    ({ ua }: { ua: string }) => {
      Object.defineProperty(navigator, "userAgent", { get: () => ua });
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      // Mock chrome runtime
      (window as unknown as Record<string, unknown>).chrome = {
        runtime: {},
      };
      // Fake plugins
      Object.defineProperty(navigator, "plugins", {
        get: () => ({ length: 5 }),
      });
      // Fake languages
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });
    },
    { ua: userAgent }
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "anti-detect" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add lib/scraping/utils/anti-detect.ts
git commit -m "feat: add browser anti-detection config (UA pool, stealth init scripts)"
```

---

### Task 7: Browser Singleton

**Files:**
- Create: `lib/scraping/utils/browser.ts`

- [ ] **Step 1: Write `lib/scraping/utils/browser.ts`**

```typescript
import { chromium, type Browser } from "playwright";

// Module-level singleton — persists across requests in the same Node.js process
let browserInstance: Browser | null = null;
let scrapeCount = 0;
let lastRestartAt = Date.now();

const MAX_SCRAPES_BEFORE_RESTART = 50;
const RESTART_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get the shared browser instance, launching or restarting as needed.
 *
 * Concurrency note: Playwright Browser supports multiple concurrent pages safely.
 * Counter drift under concurrent requests is an accepted MVP limitation.
 */
export async function getBrowser(): Promise<Browser> {
  const elapsed = Date.now() - lastRestartAt;
  const needsRestart =
    (browserInstance !== null && scrapeCount >= MAX_SCRAPES_BEFORE_RESTART) ||
    (browserInstance !== null && elapsed >= RESTART_INTERVAL_MS);

  if (needsRestart) {
    await closeBrowser();
  }

  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });
    scrapeCount = 0;
    lastRestartAt = Date.now();
  }

  scrapeCount++;
  return browserInstance;
}

/**
 * Close the browser instance. Called on restart or graceful shutdown.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close().catch(() => {
      // Ignore errors on close — browser may already be dead
    });
    browserInstance = null;
  }
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "browser" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add lib/scraping/utils/browser.ts
git commit -m "feat: add Playwright browser singleton with auto-restart"
```

---

### Task 8: Retry Logic

**Files:**
- Create: `lib/scraping/utils/retry.ts`

- [ ] **Step 1: Write `lib/scraping/utils/retry.ts`**

```typescript
interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
}

/**
 * Retry an async function with exponential backoff.
 *
 * Delays: attempt 1 = 0s, attempt 2 = baseDelayMs, attempt 3 = baseDelayMs * 3
 * Default: 3 attempts, 3s base delay
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 3000 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delay = baseDelayMs * Math.pow(3, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(
        `[scraper] Attempt ${attempt + 1}/${maxAttempts} failed:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  throw lastError;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/scraping/utils/retry.ts
git commit -m "feat: add retry util with exponential backoff"
```

---

### Task 9: Proxy Config Stubs

**Files:**
- Create: `lib/scraping/utils/proxy.ts`

- [ ] **Step 1: Write `lib/scraping/utils/proxy.ts`**

```typescript
export type ScrapingMode = "playwright" | "scrapingbee" | "zenrows" | "brightdata";

/**
 * Read SCRAPING_MODE env var. Defaults to "playwright" (direct, no proxy).
 * Only change this if direct Playwright gets blocked at scale.
 */
export function getScrapingMode(): ScrapingMode {
  const mode = process.env.SCRAPING_MODE as ScrapingMode;
  const valid: ScrapingMode[] = [
    "playwright",
    "scrapingbee",
    "zenrows",
    "brightdata",
  ];
  return valid.includes(mode) ? mode : "playwright";
}

/**
 * Returns BrightData proxy config when SCRAPING_MODE=brightdata.
 * Returns undefined otherwise (direct connection).
 */
export function getProxyConfig():
  | { server: string; username?: string; password?: string }
  | undefined {
  if (getScrapingMode() !== "brightdata") return undefined;

  const server = process.env.BRIGHTDATA_HOST;
  const username = process.env.BRIGHTDATA_USER;
  const password = process.env.BRIGHTDATA_PASS;

  if (!server) {
    throw new Error(
      "BRIGHTDATA_HOST env var required when SCRAPING_MODE=brightdata"
    );
  }

  return { server, username, password };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/scraping/utils/proxy.ts
git commit -m "feat: add proxy config stubs (playwright mode default)"
```

---

### Task 10: Cache Layer

**Files:**
- Create: `lib/scraping/utils/cache.ts`

- [ ] **Step 1: Write `lib/scraping/utils/cache.ts`**

```typescript
// drizzle-orm exports: eq, lt are query operators already used elsewhere in the project
import { eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { scrapedPages } from "@/lib/db/schema";
import type { Platform, ScrapedListing } from "@/lib/scraping/types";

/**
 * Return a cached ScrapedListing if it exists and has not expired.
 * Returns null on cache miss or expiry.
 */
export async function getCachedListing(
  url: string
): Promise<ScrapedListing | null> {
  try {
    const rows = await db
      .select()
      .from(scrapedPages)
      .where(eq(scrapedPages.url, url))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    if (new Date(row.expiresAt) < new Date()) return null;

    return row.parsedData as ScrapedListing;
  } catch (err) {
    console.warn("[scraping-cache] getCachedListing failed:", err);
    return null;
  }
}

/**
 * Write a successful ScrapedListing to cache with a 24-hour TTL.
 * Only call this when listing.scrapeSuccess === true.
 * Upserts on conflict (same URL scraped again).
 */
export async function setCachedListing(
  url: string,
  platform: Platform,
  listing: ScrapedListing
): Promise<void> {
  if (!listing.scrapeSuccess) return; // Never cache failures

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  try {
    await db
      .insert(scrapedPages)
      .values({
        url,
        platform,
        parsedData: listing as unknown as Record<string, unknown>,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: scrapedPages.url,
        set: {
          platform,
          parsedData: listing as unknown as Record<string, unknown>,
          scrapedAt: new Date(),
          expiresAt,
        },
      });
  } catch (err) {
    console.warn("[scraping-cache] setCachedListing failed:", err);
    // Non-fatal — scrape succeeded, cache write just failed
  }

  // Probabilistic cleanup: 1% chance to delete expired rows
  if (Math.random() < 0.01) {
    db.delete(scrapedPages)
      .where(lt(scrapedPages.expiresAt, new Date()))
      .catch(() => {}); // Fire and forget
  }
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep "cache" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add lib/scraping/utils/cache.ts
git commit -m "feat: add DB-backed scraping cache (24hr TTL, no failure caching)"
```

---

## Chunk 3: Viator Scraper

### Task 11: Discover `__NEXT_DATA__` Structure

This is a manual discovery step. We need to inspect the live Viator page's `__NEXT_DATA__` JSON to find the actual paths for product fields.

**Files:**
- Create: `scripts/inspect-next-data.mjs` (temporary, delete after use)

- [ ] **Step 1: Create discovery script**

```javascript
// scripts/inspect-next-data.mjs
// Run with: node scripts/inspect-next-data.mjs
import { writeFileSync } from 'fs';
import { load } from 'cheerio';

const URL = 'https://www.viator.com/tours/New-York-City/Manhattan-Helicopter-Tour/d687-5678P1';

const res = await fetch(URL, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  }
});

if (!res.ok) {
  console.error(`HTTP ${res.status} — Viator blocked the request. Use Playwright instead.`);
  process.exit(1);
}

const html = await res.text();
const $ = load(html);
const nextDataText = $('script#__NEXT_DATA__').text();

if (!nextDataText) {
  console.error('No __NEXT_DATA__ found in HTML.');
  console.log('First 2000 chars of HTML:', html.substring(0, 2000));
  process.exit(1);
}

const data = JSON.parse(nextDataText);

// Print top-level structure
console.log('\n=== __NEXT_DATA__ top-level keys ===');
console.log(Object.keys(data));

console.log('\n=== props.pageProps keys ===');
const pageProps = data?.props?.pageProps ?? {};
console.log(Object.keys(pageProps));

// Try common product keys
const productKeys = ['product', 'productPage', 'productData', 'initialData', 'productContent', 'listing'];
for (const key of productKeys) {
  if (pageProps[key]) {
    console.log(`\n=== pageProps.${key} keys ===`);
    const val = pageProps[key];
    if (typeof val === 'object' && val !== null) {
      console.log(Object.keys(val));
      if (val.description) console.log(`  description (first 200): ${String(val.description).substring(0, 200)}`);
      if (val.title) console.log(`  title: ${val.title}`);
      if (val.highlights) console.log(`  highlights: ${JSON.stringify(val.highlights).substring(0, 200)}`);
    }
  }
}

// Save full structure (first 100KB) for manual inspection
const truncated = JSON.stringify(data, null, 2).substring(0, 100000);
writeFileSync('next-data-dump.json', truncated);
console.log('\nSaved first 100KB to next-data-dump.json — inspect this file to find field paths.');
```

- [ ] **Step 2: Run discovery**

```bash
node scripts/inspect-next-data.mjs
```

**If HTTP 403 / blocked:** Viator requires a real browser. Run this Playwright script instead:

```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
  await p.goto('https://www.viator.com/tours/New-York-City/Manhattan-Helicopter-Tour/d687-5678P1', { waitUntil: 'networkidle' });
  const data = await p.evaluate(() => {
    const el = document.getElementById('__NEXT_DATA__');
    return el ? JSON.parse(el.textContent) : null;
  });
  if (!data) { console.log('No __NEXT_DATA__'); await b.close(); return; }
  console.log('pageProps keys:', Object.keys(data?.props?.pageProps ?? {}));
  const pp = data.props?.pageProps ?? {};
  for (const k of Object.keys(pp)) {
    const v = pp[k];
    if (v && typeof v === 'object' && (v.title || v.description)) {
      console.log('Found product-like key:', k);
      console.log('  title:', v.title);
      console.log('  description (first 200):', String(v.description || '').substring(0, 200));
      console.log('  highlights:', JSON.stringify(v.highlights || []).substring(0, 300));
    }
  }
  require('fs').writeFileSync('next-data-dump.json', JSON.stringify(data, null, 2).substring(0, 100000));
  await b.close();
})();
"
```

- [ ] **Step 3: Inspect `next-data-dump.json`**

Open `next-data-dump.json` and find the paths to:
- `title` — e.g. `props.pageProps.product.title`
- `description` — e.g. `props.pageProps.product.description`
- `highlights` — may be array of strings
- `itinerary` — array of stops
- `inclusions` / `exclusions`
- `price`, `rating`, `reviewCount`, `duration`
- `cancellationPolicy`, `languages`, `meetingPoint`
- `operatorName`, `badges`, `flags`

Note the exact dot-paths for each field — you'll use them in Task 12.

- [ ] **Step 4: Clean up**

```bash
rm scripts/inspect-next-data.mjs next-data-dump.json
```

---

### Task 12: Viator Selectors

**Files:**
- Create: `lib/scraping/viator/selectors.ts`

Fill in the `NEXT_DATA_PATHS` based on what you found in Task 11. The DOM fallback selectors are pre-populated below — verify them against the live page DevTools if `__NEXT_DATA__` extraction fails.

- [ ] **Step 1: Write `lib/scraping/viator/selectors.ts`**

```typescript
/**
 * Viator page extraction config.
 *
 * NEXT_DATA_PATHS: dot-notation paths into the __NEXT_DATA__ JSON.
 *   - Multiple paths per field in priority order (first non-empty wins).
 *   - Update these after inspecting a live page with inspect-next-data.mjs.
 *
 * SELECTORS: CSS selectors for DOM fallback when __NEXT_DATA__ lacks a field.
 *   - Prefer data-testid and aria attributes over class names.
 *   - Update when Viator changes their DOM.
 */

export const NEXT_DATA_PATHS: Record<string, string[]> = {
  title: [
    "props.pageProps.product.title",
    "props.pageProps.productPage.product.title",
    "props.pageProps.initialData.product.title",
  ],
  description: [
    "props.pageProps.product.description",
    "props.pageProps.productPage.product.description",
    "props.pageProps.initialData.product.description",
    "props.pageProps.product.overview",
  ],
  highlights: [
    "props.pageProps.product.highlights",
    "props.pageProps.productPage.product.highlights",
    "props.pageProps.product.inclusions.highlights",
  ],
  inclusions: [
    "props.pageProps.product.inclusions.included",
    "props.pageProps.product.inclusions",
    "props.pageProps.productPage.product.inclusions",
  ],
  exclusions: [
    "props.pageProps.product.inclusions.excluded",
    "props.pageProps.product.exclusions",
    "props.pageProps.productPage.product.exclusions",
  ],
  rating: [
    "props.pageProps.product.reviews.combinedAverageRating",
    "props.pageProps.product.rating",
    "props.pageProps.productPage.product.reviews.combinedAverageRating",
  ],
  reviewCount: [
    "props.pageProps.product.reviews.totalReviews",
    "props.pageProps.product.reviewCount",
    "props.pageProps.productPage.product.reviews.totalReviews",
  ],
  price: [
    "props.pageProps.product.pricing.summary.fromPrice",
    "props.pageProps.product.price.fromPrice",
    "props.pageProps.productPage.product.pricing.summary.fromPrice",
  ],
  currency: [
    "props.pageProps.product.pricing.currency",
    "props.pageProps.product.price.currency",
  ],
  duration: [
    "props.pageProps.product.duration.fixedDurationInMinutes",
    "props.pageProps.product.duration",
    "props.pageProps.productPage.product.duration",
  ],
  cancellationPolicy: [
    "props.pageProps.product.cancellationPolicy.description",
    "props.pageProps.product.cancellationPolicy.type",
    "props.pageProps.productPage.product.cancellationPolicy.description",
  ],
  languages: [
    "props.pageProps.product.languageGuides",
    "props.pageProps.product.languages",
  ],
  meetingPoint: [
    "props.pageProps.product.logistics.start.0.description",
    "props.pageProps.product.meetingPoint.description",
    "props.pageProps.product.logistics.meetingPoint.description",
  ],
  operatorName: [
    "props.pageProps.product.supplier.name",
    "props.pageProps.product.operatorName",
    "props.pageProps.productPage.product.supplier.name",
  ],
  groupSize: [
    "props.pageProps.product.groupSize.maxGroupSize",
    "props.pageProps.product.maxGroupSize",
  ],
  flags: [
    "props.pageProps.product.flags",
    "props.pageProps.productPage.product.flags",
  ],
  itinerary: [
    "props.pageProps.product.itinerary.itineraryItems",
    "props.pageProps.product.itinerary",
    "props.pageProps.productPage.product.itinerary.itineraryItems",
  ],
  photos: [
    "props.pageProps.product.images",
    "props.pageProps.productPage.product.images",
  ],
};

export const SELECTORS = {
  title: "h1",
  readMoreButton:
    'button:has-text("Read more"), button:has-text("Show more"), [data-testid="read-more"]',
  description:
    '[data-testid="product-description"], [data-testid="overview-description"]',
  highlights: '[data-testid="highlights"] li, [data-testid="key-facts"] li',
  inclusions:
    '[data-testid="inclusions"] li, [data-testid="whats-included"] li',
  exclusions:
    '[data-testid="exclusions"] li, [data-testid="whats-not-included"] li',
  rating:
    '[data-testid="rating-value"], [data-testid="overall-rating"], [aria-label*="rating"] span:first-child',
  reviewCount:
    '[data-testid="review-count"], [data-testid="total-reviews"]',
  price:
    '[data-testid="price"], [data-testid="from-price"], [data-testid="booking-price"]',
  originalPrice: '[data-testid="original-price"], [data-testid="strike-price"]',
  photoGallery:
    '[data-testid="gallery"] img, [data-testid="photo-gallery"] img, [data-testid="product-gallery"] img',
  duration: '[data-testid="duration"], [data-testid="tour-duration"]',
  cancellation:
    '[data-testid="cancellation-policy"], [data-testid="refund-policy"]',
  languages: '[data-testid="languages"], [data-testid="language-guides"]',
  meetingPoint:
    '[data-testid="meeting-point"], [data-testid="meeting-pickup"], [data-testid="start-location"]',
  operatorName:
    '[data-testid="operator-name"], [data-testid="supplied-by"], [data-testid="provider-name"]',
  badges:
    '[data-testid="badge"], [data-testid="product-badge"], [data-testid="award-badge"]',
  flags:
    '[data-testid="flag"], [data-testid="product-flag"], [data-testid="urgency-tag"]',
  cookieAccept:
    'button:has-text("Accept all"), button:has-text("Accept cookies"), button:has-text("I agree"), button:has-text("Got it"), [data-testid="accept-cookies"]',
  itineraryItems:
    '[data-testid="itinerary-item"], [data-testid="stop-item"]',
};
```

- [ ] **Step 2: Update paths from your discovery output**

After running Task 11, update `NEXT_DATA_PATHS` with the actual paths found in `next-data-dump.json`. Replace or add to the arrays — wrong paths are silently skipped, so extra candidates are harmless.

- [ ] **Step 3: Commit**

```bash
git add lib/scraping/viator/selectors.ts
git commit -m "feat: add Viator selectors and __NEXT_DATA__ path config"
```

---

### Task 13: Viator Scraper

**Files:**
- Create: `lib/scraping/viator/scraper.ts`

This is the core file. It tries `__NEXT_DATA__` for each field first, then falls back to DOM.

- [ ] **Step 1: Write `lib/scraping/viator/scraper.ts`**

```typescript
import * as cheerio from "cheerio";
import { getBrowser } from "@/lib/scraping/utils/browser";
import { applyStealthConfig, randomDelay } from "@/lib/scraping/utils/anti-detect";
import { withRetry } from "@/lib/scraping/utils/retry";
import { getCachedListing, setCachedListing } from "@/lib/scraping/utils/cache";
import { NEXT_DATA_PATHS, SELECTORS } from "./selectors";
import { extractViatorProductCode } from "./urls";
import type {
  PlatformScraper,
  ScrapedListing,
  ScraperResult,
  ItineraryStop,
} from "@/lib/scraping/types";
import type { Page } from "playwright";

export class ViatorScraper implements PlatformScraper {
  platform = "viator" as const;

  canHandle(url: string): boolean {
    return url.includes("viator.com");
  }

  extractProductCode(url: string): string | null {
    return extractViatorProductCode(url);
  }

  async scrape(url: string): Promise<ScraperResult> {
    // Check cache first
    const cached = await getCachedListing(url);
    if (cached) {
      console.log(`[viator-scraper] Cache hit: ${url}`);
      return { listing: cached, cached: true };
    }

    console.log(`[viator-scraper] Scraping: ${url}`);

    try {
      const listing = await withRetry(() => this.scrapeOnce(url));
      if (listing.scrapeSuccess) {
        await setCachedListing(url, "viator", listing);
      }
      return { listing, cached: false };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[viator-scraper] All retries failed for ${url}:`, error);
      return { listing: null, cached: false, error };
    }
  }

  private async scrapeOnce(url: string): Promise<ScrapedListing> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await applyStealthConfig(page);
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      await randomDelay(2000, 5000);

      // Dismiss cookie banner if present
      await this.dismissCookieBanner(page);

      // Scroll to trigger lazy-loaded content
      await this.scrollPage(page);

      // Get final URL (after redirect) and raw HTML
      const finalUrl = page.url();
      const html = await page.content();

      return await this.extractData(page, html, finalUrl);
    } finally {
      await page.close();
    }
  }

  private async dismissCookieBanner(page: Page): Promise<void> {
    try {
      const btn = page.locator(SELECTORS.cookieAccept).first();
      const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
      if (visible) {
        await btn.click();
        await randomDelay(500, 1200);
      }
    } catch {
      // Not present — continue
    }
  }

  private async scrollPage(page: Page): Promise<void> {
    for (let i = 1; i <= 4; i++) {
      await page.evaluate((fraction: number) => {
        window.scrollTo(0, document.body.scrollHeight * fraction);
      }, i / 4);
      await randomDelay(400, 800);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await randomDelay(300, 600);
  }

  private async extractData(
    page: Page,
    html: string,
    url: string
  ): Promise<ScrapedListing> {
    const errors: string[] = [];
    const productCode = this.extractProductCode(url) ?? "";

    // Parse __NEXT_DATA__ JSON (primary source)
    const nextData = this.parseNextData(html);

    // --- Title ---
    const title =
      this.getNextDataString(nextData, NEXT_DATA_PATHS.title) ??
      (await this.getTextFromDOM(page, SELECTORS.title)) ??
      "";
    if (!title) errors.push("title");

    // --- Description ---
    let description =
      this.getNextDataString(nextData, NEXT_DATA_PATHS.description) ?? "";
    if (!description) {
      // Try clicking "Read more" then extracting
      description = await this.expandDescription(page);
      if (!description) errors.push("description");
    }

    // --- Highlights ---
    const highlights =
      this.getNextDataStringArray(nextData, NEXT_DATA_PATHS.highlights) ??
      (await this.getTextArrayFromDOM(page, SELECTORS.highlights)) ??
      [];

    // --- Inclusions ---
    const inclusions =
      this.getNextDataStringArray(nextData, NEXT_DATA_PATHS.inclusions) ??
      (await this.getTextArrayFromDOM(page, SELECTORS.inclusions)) ??
      [];

    // --- Exclusions ---
    const exclusions =
      this.getNextDataStringArray(nextData, NEXT_DATA_PATHS.exclusions) ??
      (await this.getTextArrayFromDOM(page, SELECTORS.exclusions)) ??
      [];

    // --- Itinerary ---
    const itinerary = this.extractItinerary(nextData);

    // --- Rating ---
    const ratingRaw = this.getNextDataValue(nextData, NEXT_DATA_PATHS.rating);
    const rating =
      typeof ratingRaw === "number"
        ? ratingRaw
        : parseFloat(
            (await this.getTextFromDOM(page, SELECTORS.rating)) ?? "0"
          ) || 0;

    // --- Review count ---
    const reviewCountRaw = this.getNextDataValue(
      nextData,
      NEXT_DATA_PATHS.reviewCount
    );
    const reviewCount =
      typeof reviewCountRaw === "number"
        ? reviewCountRaw
        : parseInt(
            (
              (await this.getTextFromDOM(page, SELECTORS.reviewCount)) ?? "0"
            ).replace(/[^0-9]/g, ""),
            10
          ) || 0;

    // --- Price ---
    const priceRaw = this.getNextDataValue(nextData, NEXT_DATA_PATHS.price);
    const priceAmount =
      typeof priceRaw === "number"
        ? priceRaw
        : parseFloat(
            (
              (await this.getTextFromDOM(page, SELECTORS.price)) ?? "0"
            ).replace(/[^0-9.]/g, "")
          ) || 0;
    const currencyRaw =
      this.getNextDataString(nextData, NEXT_DATA_PATHS.currency) ?? "USD";
    const originalPriceText = await this.getTextFromDOM(
      page,
      SELECTORS.originalPrice
    );
    const originalAmount = originalPriceText
      ? parseFloat(originalPriceText.replace(/[^0-9.]/g, "")) || undefined
      : undefined;

    // --- Duration ---
    const durationRaw = this.getNextDataValue(
      nextData,
      NEXT_DATA_PATHS.duration
    );
    let duration = "";
    if (typeof durationRaw === "number") {
      // Convert minutes to human-readable
      duration =
        durationRaw >= 60
          ? `${Math.floor(durationRaw / 60)}h ${durationRaw % 60 > 0 ? `${durationRaw % 60}m` : ""}`.trim()
          : `${durationRaw} minutes`;
    } else if (typeof durationRaw === "string") {
      duration = durationRaw;
    } else {
      duration =
        (await this.getTextFromDOM(page, SELECTORS.duration)) ?? "";
    }

    // --- Photos ---
    const photosFromNextData = this.getNextDataValue(
      nextData,
      NEXT_DATA_PATHS.photos
    );
    let photoUrls: string[] = [];
    let photoCount = 0;

    if (Array.isArray(photosFromNextData)) {
      photoUrls = photosFromNextData
        .slice(0, 20)
        .map((img: unknown) => {
          if (typeof img === "string") return img;
          if (img && typeof img === "object") {
            const imgObj = img as Record<string, unknown>;
            // Try common image URL fields
            const variants = imgObj.variants;
            if (Array.isArray(variants) && variants.length > 0) {
              const v = variants[variants.length - 1] as Record<string, unknown>;
              return typeof v.url === "string" ? v.url : "";
            }
            return typeof imgObj.url === "string" ? imgObj.url : "";
          }
          return "";
        })
        .filter(Boolean);
      photoCount = photosFromNextData.length;
    } else {
      // Fallback to DOM
      const imgElements = await page.$$(SELECTORS.photoGallery);
      for (const el of imgElements.slice(0, 20)) {
        const src = await el.getAttribute("src");
        if (src && !src.startsWith("data:")) photoUrls.push(src);
      }
      photoCount = imgElements.length;
    }

    // --- Cancellation policy ---
    const cancellationPolicy =
      this.getNextDataString(nextData, NEXT_DATA_PATHS.cancellationPolicy) ??
      (await this.getTextFromDOM(page, SELECTORS.cancellation)) ??
      "";

    // --- Languages ---
    const langRaw = this.getNextDataValue(nextData, NEXT_DATA_PATHS.languages);
    let languages: string[] = [];
    if (Array.isArray(langRaw)) {
      languages = langRaw
        .map((l: unknown) => {
          if (typeof l === "string") return l;
          if (l && typeof l === "object") {
            const lo = l as Record<string, unknown>;
            return typeof lo.language === "string"
              ? lo.language
              : typeof lo.name === "string"
                ? lo.name
                : "";
          }
          return "";
        })
        .filter(Boolean);
    } else {
      const langText = await this.getTextFromDOM(page, SELECTORS.languages);
      if (langText) languages = langText.split(/[,;]/).map((s) => s.trim());
    }

    // --- Meeting point ---
    const meetingPoint =
      this.getNextDataString(nextData, NEXT_DATA_PATHS.meetingPoint) ??
      (await this.getTextFromDOM(page, SELECTORS.meetingPoint)) ??
      "";

    // --- Operator name ---
    const operatorName =
      this.getNextDataString(nextData, NEXT_DATA_PATHS.operatorName) ??
      (await this.getTextFromDOM(page, SELECTORS.operatorName)) ??
      "";

    // --- Group size ---
    const groupSizeRaw = this.getNextDataValue(
      nextData,
      NEXT_DATA_PATHS.groupSize
    );
    const groupSize = groupSizeRaw ? String(groupSizeRaw) : undefined;

    // --- Flags ---
    const flagsRaw = this.getNextDataValue(nextData, NEXT_DATA_PATHS.flags);
    const flags: string[] = Array.isArray(flagsRaw)
      ? flagsRaw.map(String)
      : (await this.getTextArrayFromDOM(page, SELECTORS.flags)) ?? [];

    // --- Badges ---
    const badges =
      (await this.getTextArrayFromDOM(page, SELECTORS.badges)) ?? [];

    const scrapeSuccess = title.length > 0;

    return {
      platform: "viator",
      url,
      productCode,
      title,
      description,
      highlights,
      itinerary,
      inclusions,
      exclusions,
      rating,
      reviewCount,
      price: {
        amount: priceAmount,
        currency: currencyRaw,
        originalAmount,
      },
      duration,
      photoCount,
      photoUrls,
      cancellationPolicy,
      languages,
      meetingPoint,
      groupSize,
      flags,
      badges,
      operatorName,
      scrapedAt: new Date(),
      scrapeSuccess,
      scrapeErrors: errors,
    };
  }

  // ── __NEXT_DATA__ helpers ──────────────────────────────────────────────────

  private parseNextData(html: string): Record<string, unknown> | null {
    const $ = cheerio.load(html);
    const text = $("script#__NEXT_DATA__").text();
    if (!text) return null;
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Traverse a dot-notation path through a nested object.
   * Returns the value at the first path that yields a non-null result.
   */
  private getNextDataValue(
    data: Record<string, unknown> | null,
    paths: string[]
  ): unknown {
    if (!data) return null;
    for (const path of paths) {
      const parts = path.split(".");
      let current: unknown = data;
      for (const part of parts) {
        if (current == null || typeof current !== "object") {
          current = null;
          break;
        }
        current = (current as Record<string, unknown>)[part];
      }
      if (current != null) return current;
    }
    return null;
  }

  private getNextDataString(
    data: Record<string, unknown> | null,
    paths: string[]
  ): string | null {
    const val = this.getNextDataValue(data, paths);
    if (typeof val === "string" && val.trim()) return val.trim();
    return null;
  }

  private getNextDataStringArray(
    data: Record<string, unknown> | null,
    paths: string[]
  ): string[] | null {
    const val = this.getNextDataValue(data, paths);
    if (!Array.isArray(val) || val.length === 0) return null;
    const strings = val
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          return typeof obj.description === "string"
            ? obj.description.trim()
            : typeof obj.text === "string"
              ? obj.text.trim()
              : "";
        }
        return "";
      })
      .filter(Boolean);
    return strings.length > 0 ? strings : null;
  }

  private extractItinerary(
    data: Record<string, unknown> | null
  ): ItineraryStop[] {
    const raw = this.getNextDataValue(data, NEXT_DATA_PATHS.itinerary);
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item: unknown): ItineraryStop | null => {
        if (!item || typeof item !== "object") return null;
        const obj = item as Record<string, unknown>;

        const loc = obj.pointOfInterestLocation as
          | Record<string, unknown>
          | undefined;
        const locName =
          typeof loc?.location === "object" && loc.location !== null
            ? ((loc.location as Record<string, unknown>).name as string) ?? ""
            : "";

        const name =
          typeof obj.title === "string"
            ? obj.title
            : typeof obj.name === "string"
              ? obj.name
              : locName;

        const description =
          typeof obj.description === "string" ? obj.description : "";
        const type =
          obj.passByWithoutStopping === true ? "pass-by" : ("stop" as const);
        const duration =
          typeof obj.duration === "string" ? obj.duration : undefined;

        if (!name && !description) return null;
        return { type, name, description, duration };
      })
      .filter((s): s is ItineraryStop => s !== null);
  }

  // ── DOM helpers ──────────────────────────────────────────────────────────

  private async getTextFromDOM(
    page: Page,
    selector: string
  ): Promise<string | null> {
    try {
      const el = page.locator(selector).first();
      const visible = await el.isVisible({ timeout: 2000 }).catch(() => false);
      if (!visible) return null;
      return (await el.textContent())?.trim() ?? null;
    } catch {
      return null;
    }
  }

  private async getTextArrayFromDOM(
    page: Page,
    selector: string
  ): Promise<string[] | null> {
    try {
      const elements = await page.$$(selector);
      if (elements.length === 0) return null;
      const texts = await Promise.all(
        elements.map(async (el) => (await el.textContent())?.trim() ?? "")
      );
      return texts.filter(Boolean);
    } catch {
      return null;
    }
  }

  private async expandDescription(page: Page): Promise<string> {
    try {
      const btn = page.locator(SELECTORS.readMoreButton).first();
      const visible = await btn.isVisible({ timeout: 2000 }).catch(() => false);
      if (visible) {
        await btn.click();
        await randomDelay(500, 1000);
      }
      return (
        (await this.getTextFromDOM(page, SELECTORS.description)) ?? ""
      );
    } catch {
      return "";
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors. If there are errors, fix them before proceeding.

- [ ] **Step 3: Commit**

```bash
git add lib/scraping/viator/scraper.ts
git commit -m "feat: implement ViatorScraper with __NEXT_DATA__ primary + DOM fallback"
```

---

## Chunk 4: Factory, Merge, Integration

### Task 14: Scraper Factory

**Files:**
- Create: `lib/scraping/scraper-factory.ts`

- [ ] **Step 1: Write `lib/scraping/scraper-factory.ts`**

```typescript
import { ViatorScraper } from "@/lib/scraping/viator/scraper";
import type { PlatformScraper } from "@/lib/scraping/types";

class UnsupportedPlatformError extends Error {
  constructor(url: string) {
    super(`No scraper available for URL: ${url}`);
    this.name = "UnsupportedPlatformError";
  }
}

// Singleton scraper instances
const viatorScraper = new ViatorScraper();

/**
 * Return the correct PlatformScraper for a given URL.
 *
 * Usage:
 *   const scraper = getScraperForUrl('https://www.viator.com/tours/...');
 *   const result = await scraper.scrape(url);
 */
export function getScraperForUrl(url: string): PlatformScraper {
  if (viatorScraper.canHandle(url)) return viatorScraper;

  // Future scrapers:
  // if (getYourGuideScraper.canHandle(url)) return getYourGuideScraper;
  // if (klookScraper.canHandle(url)) return klookScraper;

  throw new UnsupportedPlatformError(url);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/scraping/scraper-factory.ts
git commit -m "feat: add scraper factory (URL → PlatformScraper routing)"
```

---

### Task 15: Merge Logic

**Files:**
- Create: `lib/scraping/merge.ts`

- [ ] **Step 1: Write `lib/scraping/merge.ts`**

```typescript
import type { ViatorProduct } from "@/lib/viator/types";
import type { MergedProduct, ScrapedListing } from "@/lib/scraping/types";

/**
 * Merge Viator API product data with scraped page data.
 *
 * Rules:
 * - API wins: rating, reviewCount, pricing, tags, destinations, images (for count scoring)
 * - Scrape wins: description (if longer), inclusions, exclusions, highlights, itinerary
 *   text, photoUrls, badges, meetingPoint, operatorName, cancellationPolicy text
 * - If scraping failed (scraped is null): dataSource = 'api-only', all scrape fields empty
 */
export function mergeProductData(
  apiProduct: ViatorProduct,
  scraped: ScrapedListing | null
): MergedProduct {
  const incompleteFields: string[] = [];

  if (!scraped) {
    return {
      ...apiProduct,
      highlights: [],
      photoUrls: [],
      badges: [],
      meetingPoint: "",
      operatorName: "",
      dataSource: "api-only",
      incompleteFields: [
        "highlights",
        "photoUrls",
        "badges",
        "meetingPoint",
        "operatorName",
        "description (full)",
      ],
    };
  }

  // --- Description: prefer scrape if longer ---
  const apiDesc = apiProduct.description ?? "";
  const scrapedDesc = scraped.description ?? "";
  const description =
    scrapedDesc.length > apiDesc.length ? scrapedDesc : apiDesc;
  if (scrapedDesc.length === 0) incompleteFields.push("description");

  // --- Inclusions: prefer scrape if non-empty ---
  const inclusions =
    scraped.inclusions.length > 0
      ? scraped.inclusions
      : apiProduct.inclusions ?? [];
  if (scraped.inclusions.length === 0 && (apiProduct.inclusions ?? []).length === 0) {
    incompleteFields.push("inclusions");
  }

  // --- Exclusions: prefer scrape if non-empty ---
  const exclusions =
    scraped.exclusions.length > 0
      ? scraped.exclusions
      : apiProduct.exclusions ?? [];
  if (scraped.exclusions.length === 0 && (apiProduct.exclusions ?? []).length === 0) {
    incompleteFields.push("exclusions");
  }

  // --- Cancellation policy: wrap scraped string as ViatorCancellationPolicy ---
  const cancellationPolicy =
    scraped.cancellationPolicy
      ? {
          type: apiProduct.cancellationPolicy?.type ?? "STANDARD",
          description: scraped.cancellationPolicy,
        }
      : apiProduct.cancellationPolicy;

  // --- Itinerary: prefer scraped if non-empty ---
  const itinerary =
    scraped.itinerary.length > 0
      ? {
          itineraryItems: scraped.itinerary.map((stop) => ({
            pointOfInterestLocation:
              stop.name
                ? {
                    location: {
                      ref: "",
                      name: stop.name,
                    },
                  }
                : undefined,
            description: stop.description,
            duration: stop.duration,
          })),
        }
      : apiProduct.itinerary;

  // --- Flags: union of both sources ---
  const apiFlags = apiProduct.flags ?? [];
  const scrapedFlags = scraped.flags ?? [];
  const mergedFlags = [...new Set([...apiFlags, ...scrapedFlags])];

  // --- Highlights ---
  if (scraped.highlights.length === 0) incompleteFields.push("highlights");

  // --- Photo URLs ---
  if (scraped.photoUrls.length === 0) incompleteFields.push("photoUrls");

  return {
    ...apiProduct,
    // Overwrite API fields with enriched scrape data
    description,
    inclusions,
    exclusions,
    cancellationPolicy,
    itinerary,
    flags: mergedFlags,
    // New scrape-only fields
    highlights: scraped.highlights,
    photoUrls: scraped.photoUrls,
    badges: scraped.badges,
    meetingPoint: scraped.meetingPoint,
    operatorName: scraped.operatorName,
    groupSize: scraped.groupSize,
    // Metadata
    dataSource: "api+scrape",
    incompleteFields,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/scraping/merge.ts
git commit -m "feat: add mergeProductData (API + scrape → MergedProduct)"
```

---

### Task 16: Manual Test Endpoint

Create a temporary test route to verify end-to-end scraping before wiring into the main pipeline.

**Files:**
- Create: `app/api/test-scraper/route.ts`

- [ ] **Step 1: Write `app/api/test-scraper/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getScraperForUrl } from "@/lib/scraping/scraper-factory";
import { buildViatorUrl } from "@/lib/scraping/viator/urls";

/**
 * Manual test endpoint — DELETE after scraping is verified.
 *
 * GET /api/test-scraper?code=5678P1&dest=687
 * GET /api/test-scraper?url=https://www.viator.com/tours/...
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url =
    searchParams.get("url") ??
    (searchParams.has("code") && searchParams.has("dest")
      ? buildViatorUrl(searchParams.get("dest")!, searchParams.get("code")!)
      : null);

  if (!url) {
    return NextResponse.json(
      { error: "Provide ?url= or ?code=&dest= query params" },
      { status: 400 }
    );
  }

  const start = Date.now();

  try {
    const scraper = getScraperForUrl(url);
    const result = await scraper.scrape(url);
    const elapsed = Date.now() - start;

    return NextResponse.json({
      url,
      elapsed_ms: elapsed,
      cached: result.cached,
      error: result.error,
      listing: result.listing
        ? {
            title: result.listing.title,
            description_length: result.listing.description.length,
            description_preview: result.listing.description.substring(0, 300),
            highlights_count: result.listing.highlights.length,
            highlights: result.listing.highlights,
            itinerary_count: result.listing.itinerary.length,
            itinerary: result.listing.itinerary,
            inclusions_count: result.listing.inclusions.length,
            inclusions: result.listing.inclusions,
            exclusions_count: result.listing.exclusions.length,
            rating: result.listing.rating,
            reviewCount: result.listing.reviewCount,
            price: result.listing.price,
            duration: result.listing.duration,
            photoCount: result.listing.photoCount,
            photoUrls_count: result.listing.photoUrls.length,
            photoUrls_preview: result.listing.photoUrls.slice(0, 3),
            cancellationPolicy: result.listing.cancellationPolicy,
            languages: result.listing.languages,
            meetingPoint: result.listing.meetingPoint,
            operatorName: result.listing.operatorName,
            badges: result.listing.badges,
            flags: result.listing.flags,
            scrapeSuccess: result.listing.scrapeSuccess,
            scrapeErrors: result.listing.scrapeErrors,
          }
        : null,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
        elapsed_ms: Date.now() - start,
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

- [ ] **Step 3: Test on the helicopter tour**

Open in browser or run:
```bash
curl "http://localhost:3000/api/test-scraper?code=5678P1&dest=687" | python3 -m json.tool
```

Expected response includes:
- `scrapeSuccess: true`
- `description_length` > 200 (full description, not truncated)
- `highlights` array with 3-6 items
- `inclusions` array populated
- `rating` > 0
- `photoCount` > 0

- [ ] **Step 4: If description is empty or truncated**

The `__NEXT_DATA__` paths may be wrong. Open the URL in Chrome DevTools and run in Console:
```javascript
const d = JSON.parse(document.getElementById('__NEXT_DATA__').textContent);
// Explore:
Object.keys(d.props.pageProps)
// Find product-like key, then:
d.props.pageProps.<key>.description
```

Update `NEXT_DATA_PATHS` in `lib/scraping/viator/selectors.ts` with the correct paths.

- [ ] **Step 5: Test cache hit**

Run the same curl command again. Response should show `cached: true` and return faster.

- [ ] **Step 6: Commit test route**

```bash
git add app/api/test-scraper/route.ts
git commit -m "feat: add temporary test-scraper API endpoint"
```

---

### Task 17: Integrate Into Analysis Pipeline

**Files:**
- Modify: `app/api/analyze/route.ts`

Wire the scraping layer into `processAnalysis()`. Scraping errors are always swallowed — the analysis always completes.

- [ ] **Step 1: Add imports to `app/api/analyze/route.ts`**

After the existing imports, add:
```typescript
import { getScraperForUrl } from "@/lib/scraping/scraper-factory";
import { buildViatorUrl } from "@/lib/scraping/viator/urls";
import { mergeProductData } from "@/lib/scraping/merge";
```

- [ ] **Step 2: Update `processAnalysis` to add scraping step**

Find this block in `processAnalysis` (after `formatCompetitorData`):

```typescript
// 3. Fetch reviews (operator + top 3 competitors)
const operatorReviews = await fetchReviews(productCode, 20);
```

Insert the scraping block **before** step 3:

```typescript
// 2b. Scrape operator page for full content
console.log(`Scraping operator page: ${productCode}`);
const operatorUrl = buildViatorUrl(
  product.destinations[0]?.ref ?? "",
  productCode
);
const operatorScraper = getScraperForUrl(operatorUrl);
const { listing: operatorScrape } = await operatorScraper
  .scrape(operatorUrl)
  .catch((err) => {
    console.warn(`Operator scrape failed (continuing with API only):`, err);
    return { listing: null, cached: false };
  });

// Scrape top 3 competitors sequentially (best-effort)
for (const competitor of competitors.slice(0, 3)) {
  if (!competitor.destinationRef) continue;
  const compUrl = buildViatorUrl(competitor.destinationRef, competitor.productCode);
  const compScraper = getScraperForUrl(compUrl);
  await compScraper.scrape(compUrl).catch((err) => {
    console.warn(`Competitor scrape failed for ${competitor.productCode}:`, err);
  });
  // Note: competitor scrape data is stored in cache for future use,
  // but not used in scoring in this iteration.
}

// Merge API + scrape data
const mergedProduct = mergeProductData(product, operatorScrape);
console.log(
  `Scrape result: dataSource=${mergedProduct.dataSource}, ` +
  `descriptionLength=${mergedProduct.description.length}, ` +
  `highlights=${mergedProduct.highlights.length}`
);

// 3. Fetch reviews (operator + top 3 competitors)
```

- [ ] **Step 3: Replace `product` with `mergedProduct` in scoring and AI calls**

Find these lines (around the end of `processAnalysis`):

```typescript
// 4. Calculate scores
const scores = calculateScores(product, competitors);

// 5. Generate AI recommendations (parallel)
const [recommendations, reviewInsights] = await Promise.all([
  generateRecommendations(product, competitors, operatorReviews, competitorReviews),
  generateReviewInsights(operatorReviews, competitorReviews),
]);
```

Replace `product` with `mergedProduct`:

```typescript
// 4. Calculate scores
const scores = calculateScores(mergedProduct, competitors);

// 5. Generate AI recommendations (parallel)
const [recommendations, reviewInsights] = await Promise.all([
  generateRecommendations(mergedProduct, competitors, operatorReviews, competitorReviews),
  generateReviewInsights(operatorReviews, competitorReviews),
]);
```

Also update the DB write to store `mergedProduct` instead of `product`:

```typescript
productData: mergedProduct as unknown as Record<string, unknown>,
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 5: End-to-end test**

Start the dev server and submit a real Viator product code via the main UI. Check logs for:
```
Scraping operator page: <productCode>
[viator-scraper] Scraping: https://www.viator.com/tours/d687-5678P1
Scrape result: dataSource=api+scrape, descriptionLength=XXX, highlights=X
```

Then check the report page to see if the description and recommendations are richer.

- [ ] **Step 6: Commit**

```bash
git add app/api/analyze/route.ts
git commit -m "feat: integrate scraping layer into analysis pipeline"
```

---

### Task 18: Cleanup

- [ ] **Step 1: Delete test route (after verifying end-to-end works)**

```bash
rm -rf app/api/test-scraper
```

- [ ] **Step 2: Final build check**

```bash
npm run build
```

Expected: build completes without errors.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: remove temporary test-scraper endpoint"
```

---

## Post-Implementation Checklist

Manually test these scenarios after implementation:

- [ ] Standard Viator product — description populated, longer than API version
- [ ] Cached result — second request returns `cached: true`, faster response
- [ ] Invalid URL — graceful error, `listing: null`, analysis continues with API data
- [ ] Product with highlights — `highlights` array populated
- [ ] Product with itinerary — `itinerary` array populated with stops
- [ ] `dataSource` field visible in logs for each analysis run
- [ ] `npm run build` passes with zero TypeScript errors
