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
├── types.ts                    # Shared ScrapedListing interface + PlatformScraper abstract
├── scraper-factory.ts          # URL detection → correct scraper instance
├── merge.ts                    # Merge API data + scraped data into unified product
├── viator/
│   ├── scraper.ts              # Viator page scraper (implements PlatformScraper)
│   └── selectors.ts            # CSS selectors / __NEXT_DATA__ paths for Viator
└── utils/
    ├── browser.ts              # Playwright browser lifecycle manager
    ├── anti-detect.ts          # UA pool, viewport randomization, stealth config
    ├── proxy.ts                # Proxy config stubs (disabled by default)
    ├── retry.ts                # Exponential backoff with UA/viewport rotation
    └── cache.ts                # DB-backed cache (scraped_pages table)
```

**No `src/` prefix** — all files at root-level `lib/scraping/`, consistent with existing `lib/viator/`, `lib/db/`, etc.

---

## Data Flow

```
analyze/route.ts
  → viator/products.ts          (API: ratings, pricing, tags, competitor discovery)
  → scraping/viator/scraper.ts  (Scrape: full description, highlights, itinerary)
  → scraping/merge.ts           (Combine: API wins for metrics, scrape wins for content)
  → scoring.ts                  (Score using merged, enriched data)
  → recommendations.ts          (AI with full content context)
```

Scraping runs **after** the API fetch (needs product URL, which is constructed from product code). Scraping is sequential (not parallel) across multiple products to avoid detection.

---

## Types (`lib/scraping/types.ts`)

```typescript
export type Platform = 'viator' | 'getyourguide' | 'klook' | 'civitatis';

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

export interface ItineraryStop {
  type: 'stop' | 'pass-by';
  name: string;
  description: string;
  duration?: string;
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

## Viator Scraper (`lib/scraping/viator/scraper.ts`)

**URL pattern:** `https://www.viator.com/tours/{City}/{Title}/d{destId}-{productCode}`
**Product code extraction:** regex `/d\d+-([A-Z0-9]+)/i` on path

**Extraction strategy (priority order):**

1. **`__NEXT_DATA__` JSON** (primary) — Viator is Next.js; `<script id="__NEXT_DATA__">` contains full product data as JSON. Parse with cheerio, traverse to find description, highlights, itinerary. Most reliable — avoids clicking "Read more".

2. **DOM selectors** (fallback) — If `__NEXT_DATA__` doesn't contain a field, use Playwright to extract from rendered DOM. Selectors stored in `selectors.ts`.

3. **API supplement** (last resort) — If both fail for a field, accept API data and record in `scrapeErrors[]`.

**Stealth measures:**
- Randomize User-Agent from pool of 15 real Chrome UAs
- Randomize viewport (1366×768 / 1440×900 / 1536×864 / 1920×1080)
- Random delay 2-5s after page load before extraction
- Dismiss cookie/consent banners
- Scroll page naturally before extracting (triggers lazy-loaded content)
- Single browser instance reused across scrapes, auto-restart every 50 scrapes or 1 hour

---

## Selectors (`lib/scraping/viator/selectors.ts`)

All CSS selectors in one file. Prefer data attributes and semantic HTML over class names (Viator changes class names frequently). Verified against live Viator product pages.

---

## Cache (`lib/scraping/utils/cache.ts`)

**Table:** `scraped_pages`
**Key:** `url` (primary key)
**TTL:** 24 hours
**Flow:** check cache → if hit, return with `cached: true` → if miss, scrape → upsert result

```sql
CREATE TABLE scraped_pages (
  url TEXT PRIMARY KEY,
  platform VARCHAR(20) NOT NULL,
  html TEXT,
  parsed_data JSONB NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_scraped_pages_expires ON scraped_pages(expires_at);
CREATE INDEX idx_scraped_pages_platform ON scraped_pages(platform);
```

Schema added to `lib/db/schema.ts` and migration generated via `npm run db:generate`.

---

## Retry Logic (`lib/scraping/utils/retry.ts`)

- Max 3 attempts
- Delays: 0s → 3s → 9s
- On each retry: rotate UA, rotate viewport, rotate proxy if configured
- On full failure: return partial data, `scrapeSuccess: false`, populate `scrapeErrors[]`

---

## Merge Logic (`lib/scraping/merge.ts`)

| Winner | Fields |
|--------|--------|
| API | rating, reviewCount, price/currency, tags, destinations, availability |
| Scrape | title, description, highlights, itinerary text, inclusions/exclusions text, actual photoCount, badges, flags |
| Either | Whichever is more complete — fallback to the other if null/empty |

Output type: `MergedProduct` extends `ScrapedListing` with API-only fields added.
Tracks: `dataSource: 'api+scrape' | 'api-only'` and `incompleteFields: string[]`.

---

## Rate Limiting

- Max 1 scrape per 3-5 seconds (random delay)
- Max 20 scrapes per hour (in-memory counter)
- Max 4 scrapes per analysis run (operator + top 3 competitors)
- Never re-scrape a URL within 24-hour cache window
- Sequential, never parallel

---

## Proxy Config (`lib/scraping/utils/proxy.ts`)

Disabled by default. Environment variable `SCRAPING_MODE` selects mode:
- `playwright` (default, free, direct)
- `scrapingbee` — ScrapingBee API
- `zenrows` — Zenrows API
- `brightdata` — Playwright + BrightData residential proxies

Only activate if Playwright stealth gets blocked at scale.

---

## DB Migration

1. Add `scrapedPages` table to `lib/db/schema.ts`
2. Run `npm run db:generate` to create versioned migration file
3. User runs `npm run db:push` to apply

---

## New Dependencies

```bash
npm install playwright playwright-extra puppeteer-extra-plugin-stealth cheerio
npx playwright install chromium
```

---

## Test URL

`https://www.viator.com/tours/New-York-City/Manhattan-Helicopter-Tour/d687-5678P1`

---

## Success Criteria

- `ScrapedListing.description` contains the full, un-truncated Viator description
- `ScrapedListing.highlights` is populated with the bullet-point highlights
- `ScrapedListing.itinerary` reflects all itinerary stops with names + descriptions
- All fields extracted from `__NEXT_DATA__` without needing "Read more" click
- Cache prevents re-scraping within 24 hours
- Failed scrapes degrade gracefully (API-only fallback, `scrapeSuccess: false`)
- Scoring engine receives richer data and produces better recommendations
