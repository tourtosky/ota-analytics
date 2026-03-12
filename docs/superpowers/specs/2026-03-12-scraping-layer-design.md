# TourBoost — Web Scraping Layer Design

**Date:** 2026-03-12
**Status:** Approved
**Scope:** Add a platform-agnostic scraping layer to supplement Viator Partner API data

---

## Problem

The Viator Partner API returns truncated descriptions and incomplete content. The scraping layer gets the full page content as travelers see it. Future platforms (GetYourGuide, Klook, Civitatis) have no API at all — scraping will be the only data source.

---

## Architecture

```
lib/scraping/
├── types.ts                    # ScrapedListing, PlatformScraper, MergedProduct
├── scraper-factory.ts          # getScraperForUrl(url) → PlatformScraper
├── merge.ts                    # mergeProductData(api, scraped) → MergedProduct
├── viator/
│   ├── scraper.ts              # ViatorScraper (implements PlatformScraper)
│   ├── selectors.ts            # __NEXT_DATA__ paths + CSS selector fallbacks
│   └── urls.ts                 # buildViatorUrl(destId, productCode) → string
└── utils/
    ├── browser.ts              # Playwright browser singleton + lifecycle
    ├── anti-detect.ts          # UA pool, viewport pool, stealth page setup
    ├── proxy.ts                # Proxy config stubs (disabled by default)
    ├── retry.ts                # withRetry(fn, maxAttempts) with backoff + UA rotation
    └── cache.ts                # DB-backed cache: get/set ScrapedListing by URL
```

**No `src/` prefix** — root-level `lib/scraping/`, consistent with `lib/viator/`, `lib/db/`.

---

## Data Flow

```
analyze/route.ts (processAnalysis)
  1. fetchProduct(productCode)            → ViatorProduct          [API]
  2. searchCompetitors(...)               → CompetitorData[]       [API]
  3. scrapeViatorProduct(productCode,     → ScrapedListing | null  [scrape]
       destinationRef)
  4. scrapeCompetitors(top3Codes,         → Map<code, Scraped>     [scrape, sequential]
       destinationRef)
  5. mergeProductData(apiProduct,         → MergedProduct          [merge]
       scrapedListing)
  6. calculateScores(merged, competitors) → ProductScores          [scoring]
  7. generateRecommendations(merged, ...) → AIRecommendation[]     [AI]
```

Scraping is sequential (never parallel) to avoid detection. Competitor scraping is **best-effort**: if it fails, the analysis proceeds with API-only competitor data and `dataSource: 'api-only'` for those competitors.

---

## URL Construction

Viator product page URLs follow this pattern:
```
https://www.viator.com/tours/{CitySlug}/{TitleSlug}/d{destId}-{productCode}
```

The full slug URL is not needed. Playwright follows redirects, so we use the short canonical form:
```
https://www.viator.com/tours/d{destId}-{productCode}
```

Where:
- `destId` = `product.destinations[0].ref` (already available from API, e.g. `"687"`)
- `productCode` = the product code (e.g. `"5678P1"`)

**Example:** `https://www.viator.com/tours/d687-5678P1`

This URL redirects to the full canonical URL, which Playwright handles automatically. The `productCode` and `destId` are both available in `ViatorProduct` before scraping begins. Same construction applies to competitor URLs using `CompetitorData.productCode` — but competitor destination refs must be sourced from the search result (`ViatorProductSearchResult.destinations[0].ref`), so `formatCompetitorData` must preserve `destinationRef` in `CompetitorData`.

---

## Types (`lib/scraping/types.ts`)

```typescript
export type Platform = 'viator' | 'getyourguide' | 'klook' | 'civitatis';

export interface ItineraryStop {
  type: 'stop' | 'pass-by';
  name: string;
  description: string;
  duration?: string;
}

export interface ScrapedListing {
  platform: Platform;
  url: string;
  productCode: string;
  title: string;
  description: string;
  highlights: string[];
  itinerary: ItineraryStop[];
  inclusions: string[];
  exclusions: string[];
  rating: number;
  reviewCount: number;
  price: { amount: number; currency: string; originalAmount?: number; };
  duration: string;
  photoCount: number;
  photoUrls: string[];
  cancellationPolicy: string;
  languages: string[];
  meetingPoint: string;
  groupSize?: string;
  accessibility?: string[];
  flags: string[];
  badges: string[];
  operatorName: string;
  operatorResponseRate?: string;
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
```

---

## MergedProduct Type

`MergedProduct` is a structural superset of `ViatorProduct`. All existing functions that accept
`ViatorProduct` (`calculateScores`, `generateRecommendations`) accept `MergedProduct` without
modification — no changes to `scoring.ts` or `recommendations.ts`.

`ViatorProduct.cancellationPolicy` is typed as `{ type: string; description?: string } | undefined`.
TypeScript does not allow `interface extends` to change a field to an incompatible type, so
`MergedProduct` uses `Omit` to drop the field and redeclare it as a string:

```typescript
// lib/scraping/types.ts

export interface MergedProduct extends Omit<ViatorProduct, 'cancellationPolicy'> {
  // Redeclared field — string instead of ViatorCancellationPolicy object
  cancellationPolicy: string;

  // Enriched by scraping (override ViatorProduct fields with fuller content)
  description: string;
  inclusions: string[];
  exclusions: string[];

  // New fields from scraping (no ViatorProduct equivalent)
  highlights: string[];
  photoUrls: string[];
  badges: string[];
  meetingPoint: string;
  operatorName: string;
  groupSize?: string;

  // Merge metadata
  dataSource: 'api+scrape' | 'api-only';
  incompleteFields: string[];
}
```

`calculateScores(product: ViatorProduct, ...)` receives a `MergedProduct`. TypeScript accepts this
because `MergedProduct` satisfies the structural shape of `ViatorProduct` minus `cancellationPolicy`,
and the scoring engine only checks `cancellationPolicy` for truthiness (not its internal shape).
The compiler is satisfied — no cast needed.

---

## Merge Logic (`lib/scraping/merge.ts`)

```typescript
function mergeProductData(
  apiProduct: ViatorProduct,
  scraped: ScrapedListing | null
): MergedProduct
```

**Merge rules:**

| Field | Winner | Tiebreaker |
|---|---|---|
| `rating`, `reviewCount` | API always | — |
| `pricing`, `currency` | API always | — |
| `tags`, `destinations` | API always | — |
| `title` | Longer non-empty string | If equal length, prefer scrape |
| `description` | Scrape if len > API len | Otherwise API; record in `incompleteFields` |
| `highlights` | Scrape if non-empty | Otherwise `[]`; no API equivalent |
| `itinerary` | Scrape if non-empty | Otherwise API itinerary items (reformatted) |
| `inclusions`, `exclusions` | Scrape if non-empty | Otherwise API arrays |
| `photoCount` | Max of API image count vs scraped photoCount | — |
| `photoUrls` | Scrape (API doesn't provide direct URLs in same format) | — |
| `badges`, `flags` | Union of both sources | Deduplicate |
| `cancellationPolicy` | Scraped string if non-empty | Otherwise API description field |
| `languages` | API (more structured) | — |
| `operatorName`, `meetingPoint`, `groupSize` | Scrape | No API equivalent |

If `scraped` is null: `dataSource = 'api-only'`, `incompleteFields` lists all scrape-only fields.

---

## Scraper Factory (`lib/scraping/scraper-factory.ts`)

```typescript
// Exported function — only public API of this module
export function getScraperForUrl(url: string): PlatformScraper

// Usage in analyze/route.ts:
import { getScraperForUrl } from '@/lib/scraping/scraper-factory';
const scraper = getScraperForUrl(viatorUrl);
const result = await scraper.scrape(viatorUrl);
```

Internally matches URL hostname:
- `viator.com` → returns `ViatorScraper` instance (singleton)
- `getyourguide.com` → throws `UnsupportedPlatformError` (future)
- Unknown → throws `UnsupportedPlatformError`

---

## Viator Scraper (`lib/scraping/viator/scraper.ts`)

**Extraction strategy (priority order per field):**

1. **`__NEXT_DATA__` JSON** (primary) — parse `<script id="__NEXT_DATA__">` with cheerio; traverse JSON to extract fields. No browser needed for fields available here.

2. **Rendered DOM** (fallback) — use Playwright page, apply selectors from `selectors.ts`. Required for lazy-loaded content or fields not in `__NEXT_DATA__`.

3. **Accept empty** (last resort) — if both fail for a field, leave it empty/`[]`, add to `scrapeErrors[]`.

**`scrape(url)` implementation steps:**
1. Check cache — if hit, return `{ listing, cached: true }`
2. Launch page via `getBrowser()` singleton
3. Apply stealth config from `anti-detect.ts`
4. Navigate to URL (`waitUntil: 'networkidle'`)
5. Random delay 2000-5000ms
6. Dismiss cookie banner if present
7. Scroll page (3 incremental scrolls to trigger lazy load)
8. Extract `__NEXT_DATA__` JSON via `page.evaluate()` or cheerio
9. Extract remaining fields from DOM using selectors
10. Close page (keep browser alive)
11. Write result to cache
12. Return `{ listing, cached: false }`

---

## Selectors (`lib/scraping/viator/selectors.ts`)

All CSS selectors and `__NEXT_DATA__` JSON paths in one file. When Viator changes DOM, only this file updates.

**`__NEXT_DATA__` paths to try** (verified against test URL `d687-5678P1`, update as needed):
```typescript
export const NEXT_DATA_PATHS = {
  // Try these key paths in order; first non-null/non-empty wins
  description: [
    'props.pageProps.product.description',
    'props.pageProps.productContent.description',
    'props.pageProps.initialData.product.description',
  ],
  title: [
    'props.pageProps.product.title',
    'props.pageProps.productContent.title',
  ],
  highlights: [
    'props.pageProps.product.highlights',
    'props.pageProps.productContent.highlights',
  ],
  // ... (to be populated after inspecting live __NEXT_DATA__ from test URL)
};
```

**DOM selector fallbacks:**
```typescript
export const SELECTORS = {
  title: 'h1',
  readMoreButton: 'button:has-text("Read more"), button:has-text("Show more")',
  inclusions: '[data-testid="inclusions"] li, [data-testid="whats-included"] li',
  exclusions: '[data-testid="exclusions"] li, [data-testid="whats-not-included"] li',
  rating: '[data-testid="rating-value"], [aria-label*="rating"]',
  reviewCount: '[data-testid="review-count"]',
  price: '[data-testid="price"], [data-testid="from-price"]',
  photos: 'img[data-testid="gallery-image"], [data-testid="photo-gallery"] img',
  duration: '[data-testid="duration"]',
  cancellation: '[data-testid="cancellation-policy"]',
  languages: '[data-testid="languages"]',
  meetingPoint: '[data-testid="meeting-point"], [data-testid="meeting-pickup"]',
  operatorName: '[data-testid="operator-name"], [data-testid="supplied-by"]',
  badges: '[data-testid="badge"], [data-testid="product-badge"]',
  flags: '[data-testid="flag"], [data-testid="product-flag"]',
  cookieAccept: 'button:has-text("Accept"), button:has-text("I agree"), button:has-text("Got it")',
};
```

**Note:** Selectors are initial guesses. Step 1 of implementation is to open the test URL in a real browser, inspect DOM, and verify/correct every selector before writing extraction logic.

---

## Browser Manager (`lib/scraping/utils/browser.ts`)

**Singleton pattern:**

```typescript
// Module-level state (persists across requests in same Node.js process)
let browserInstance: Browser | null = null;
let scrapeCount = 0;
let lastRestartAt = Date.now();
const MAX_SCRAPES_BEFORE_RESTART = 50;
const RESTART_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export async function getBrowser(): Promise<Browser>
export async function closeBrowser(): Promise<void>
```

`getBrowser()`:
1. If `browserInstance` is alive AND `scrapeCount < 50` AND `elapsed < 1hr` → return existing
2. If restart condition met → call `closeBrowser()`, set `browserInstance = null`, reset counter
3. Launch new browser with stealth args, set `browserInstance`
4. Return instance

**Each scrape call:**
- Opens a new `Page` via `browser.newPage()`
- Closes the page when done (regardless of success/failure)
- Increments `scrapeCount`

**Concurrency:** Next.js API routes can run concurrently. The browser singleton is not thread-safe by default. For MVP: accept that concurrent requests may both call `getBrowser()` and get the same instance (Playwright browser supports multiple pages safely). The restart logic uses a simple counter — concurrent increments may drift, which is acceptable for MVP.

**Launch args:**
```typescript
{ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] }
```

---

## Anti-Detection (`lib/scraping/utils/anti-detect.ts`)

Uses plain `playwright` only — no `playwright-extra` or `puppeteer-extra-plugin-stealth`. Manual stealth via `page.addInitScript()` and request interception.

```typescript
// UA pool — update quarterly
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  // 10 more variants...
];

export const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1366, height: 768 },
];

// Applied to every new page before navigation:
export async function applyStealthConfig(page: Page): Promise<void>
  // 1. Set random UA + viewport
  // 2. addInitScript: override navigator.webdriver = false
  // 3. addInitScript: mock chrome runtime object
  // 4. addInitScript: override plugins length
  // 5. Set Accept-Language header
```

---

## Retry Logic (`lib/scraping/utils/retry.ts`)

```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number; baseDelayMs?: number }
): Promise<T>
```

- Default: 3 attempts, base delay 3000ms (multiplied by attempt index: 0s, 3s, 9s)
- On each retry: pick new random UA and viewport via `anti-detect.ts`
- Does NOT rotate proxies in default mode (only if `SCRAPING_MODE=brightdata`)
- On all attempts exhausted: rethrow last error

---

## Cache (`lib/scraping/utils/cache.ts`)

```typescript
export async function getCachedListing(url: string): Promise<ScrapedListing | null>
export async function setCachedListing(url: string, platform: Platform, listing: ScrapedListing): Promise<void>
```

**HTML storage policy:** Raw HTML is **never stored** (`html` column always `NULL`). The column exists in schema for future debug use but is not populated. This keeps the `scraped_pages` table compact.

**Failed scrape caching policy:** Results with `scrapeSuccess: false` are **not cached**. Only successful scrapes (at least partial data extracted) with `scrapeSuccess: true` are written to cache. This allows transient failures (rate limiting, network errors) to be retried on the next analysis request.

**Cache TTL:** 24 hours.

**Cleanup:** `DELETE FROM scraped_pages WHERE expires_at < NOW()` — run at application startup (lazy, non-blocking) and on each `setCachedListing` call (probabilistic, 1-in-100 chance to avoid overhead).

---

## DB Schema Addition

Add to `lib/db/schema.ts`:

```typescript
export const scrapedPages = pgTable('scraped_pages', {
  url: text('url').primaryKey(),
  platform: varchar('platform', { length: 20 }).notNull(),
  html: text('html'),                                    // always NULL for now
  parsedData: jsonb('parsed_data').$type<ScrapedListing>().notNull(),
  scrapedAt: timestamp('scraped_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});
```

Migration: `npm run db:generate` (creates versioned file in `drizzle/` directory).

**`CompetitorData` type change:** Add `destinationRef: string` to `lib/viator/types.ts`:

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
  destinationRef: string;   // NEW — from ViatorProductSearchResult.destinations[0].ref
}
```

`formatCompetitorData` in `lib/viator/products.ts` maps `product.destinations?.[0]?.ref ?? ''`
to `destinationRef`. Competitor scraping uses this to construct:
`buildViatorUrl(competitor.destinationRef, competitor.productCode)`

Competitor scrapes (top 3) are **in scope for this implementation**. They run sequentially after the
operator scrape, with best-effort error handling (failures skip that competitor's scrape, not the
whole analysis).

---

## Proxy Config (`lib/scraping/utils/proxy.ts`)

Disabled by default. Controlled by `SCRAPING_MODE` env var:
- `playwright` (default) — direct Playwright, no proxy
- `scrapingbee` — ScrapingBee API (`SCRAPINGBEE_API_KEY` required)
- `zenrows` — Zenrows API (`ZENROWS_API_KEY` required)
- `brightdata` — Playwright + BrightData (`BRIGHTDATA_HOST`, `BRIGHTDATA_USER`, `BRIGHTDATA_PASS` required)

Only activate non-default mode if direct Playwright gets blocked at scale.

---

## Integration: `analyze/route.ts` Changes

In `processAnalysis()`, after step 2 (search competitors), add:

```typescript
import { buildViatorUrl } from '@/lib/scraping/viator/urls';
import { getScraperForUrl } from '@/lib/scraping/scraper-factory';
import { mergeProductData } from '@/lib/scraping/merge';

// After competitors are formatted:
const operatorUrl = buildViatorUrl(product.destinations[0].ref, productCode);
const scraper = getScraperForUrl(operatorUrl);
const { listing: operatorScrape } = await scraper.scrape(operatorUrl).catch(() => ({ listing: null, cached: false }));

// Scrape top 3 competitors sequentially (best-effort)
const competitorScrapes = new Map<string, ScrapedListing | null>();
for (const competitor of competitors.slice(0, 3)) {
  const compUrl = buildViatorUrl(competitor.destinationRef, competitor.productCode);
  const compScraper = getScraperForUrl(compUrl);
  const { listing } = await compScraper.scrape(compUrl).catch(() => ({ listing: null, cached: false }));
  competitorScrapes.set(competitor.productCode, listing);
}

const mergedProduct = mergeProductData(product, operatorScrape);

// Pass mergedProduct (not product) to scoring and AI:
const scores = calculateScores(mergedProduct, competitors);
const [recommendations, reviewInsights] = await Promise.all([
  generateRecommendations(mergedProduct, competitors, operatorReviews, competitorReviews),
  generateReviewInsights(operatorReviews, competitorReviews),
]);
```

Scraping errors are swallowed with `.catch(() => ({ listing: null }))` — analysis always completes even if scraping fails entirely.

---

## Rate Limiting

- Random delay 2-5 seconds between page load and extraction (in scraper)
- Max 4 scrapes per analysis run (1 operator + 3 competitor pages)
- In-memory counter for hourly limit (20/hr) — per-process only, **MVP limitation acknowledged**. At current scale (single-process dev/staging), this is sufficient.
- Cache prevents re-scraping within 24 hours

---

## New Dependencies

```bash
npm install playwright cheerio
npx playwright install chromium
```

`playwright-extra` and `puppeteer-extra-plugin-stealth` are **not used** — manual stealth via `page.addInitScript()` is sufficient and avoids dependency compatibility issues.

---

## Test URL

`https://www.viator.com/tours/New-York-City/Manhattan-Helicopter-Tour/d687-5678P1`
(Playwright follows redirect from short form `https://www.viator.com/tours/d687-5678P1`)

---

## Success Criteria

- `ScrapedListing.description` contains the full, un-truncated description
- `ScrapedListing.highlights` populated from bullet-point highlights on page
- `ScrapedListing.itinerary` reflects all stops with names + descriptions
- `__NEXT_DATA__` extraction works without clicking "Read more"
- Cache prevents re-scraping within 24 hours; failed scrapes are not cached
- Failed scrapes degrade gracefully — analysis completes with `dataSource: 'api-only'`
- `calculateScores` and `generateRecommendations` receive `MergedProduct` with no signature changes
