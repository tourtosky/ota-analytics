# CLAUDE.md - Peregrio

## Project Overview

Peregrio is a SaaS application that helps tour operators optimize their Viator listings. It analyzes a listing against top competitors in the same destination/category, produces a 0-100 score across 6 categories, and generates AI-powered recommendations to improve bookings. The app has auth, role-based dashboards (admin + client), paid Stripe plans, and a Viator scraping fallback alongside the Partner API.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 + Framer Motion
- **Database**: Supabase PostgreSQL with Drizzle ORM
- **Auth**: Supabase Auth (`@supabase/ssr`) + middleware-based session
- **Payments**: Stripe (Checkout + Customer Portal + webhooks)
- **AI**: Multi-provider via `lib/ai/provider.ts` — Anthropic Claude (`claude-sonnet-4-20250514`) and OpenAI (`gpt-4o-mini`)
- **External APIs**: Viator Partner API v2.0; ZenRows + Playwright for scraping fallback
- **Icons**: Lucide React
- **Fonts**: Plus Jakarta Sans (body), Playfair Display (headings), JetBrains Mono (code/numbers)

## Deployment

- **Hosting**: Vercel
- **Domain**: `peregrio.com`
- **Environments**:
  - **Local dev** → uses `.env.local` (dev Supabase project `svlmnaqwnpzpqfojhhfm`)
  - **Production** → env vars live ONLY in Vercel project settings; production Supabase is a separate project not referenced locally. Never copy prod secrets into `.env.local`.
- Stripe keys in `.env.local` are **test mode**; prod uses live keys set in Vercel.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Run production server
npm run lint         # ESLint (extends next/core-web-vitals)
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema to PostgreSQL (dev DB only — never run against prod)
npm run db:studio    # Open Drizzle Studio GUI
npm run check        # Verify setup (check-setup.js)
```

## Project Structure

```
app/
  layout.tsx                    # Root layout (fonts, metadata)
  page.tsx                      # Landing page
  globals.css                   # Tailwind v4 theme + custom utilities
  login/                        # Supabase Auth login/register
  pricing/                      # Public pricing page (Stripe plans)
  report/[id]/                  # Public analysis report (polls for results)
  dashboard/                    # Client dashboard (auth required, role=client)
    layout.tsx
    page.tsx
    listings/                   # Tracked listings view
    settings/                   # Profile + billing (Stripe portal)
  admin/                        # Admin dashboard (auth required, role=admin)
    layout.tsx
    page.tsx
    analyses/
    clients/                    # View + change client plans
    api-usage/
    scraping/
    theme.css
  api/
    analyze/route.ts            # POST - starts async analysis
    report/[id]/route.ts        # GET - returns analysis results
    auth/me/                    # Current user + profile
    dashboard/analyses/         # Client's own analyses
    dashboard/profile/          # Profile read/update
    admin/stats/                # Admin KPIs
    admin/clients/              # Admin client management
    admin/analysis/             # Admin analysis operations
    stripe/checkout/            # Create Checkout session
    stripe/portal/              # Create Customer Portal session
    stripe/webhook/             # Stripe webhook (plan sync)
    test-scraper/               # Dev-only scraper test

components/
  AnalyzeForm.tsx               # URL input + product code extraction
  RegisterModal.tsx             # Signup modal (post-analysis capture)
  ScoreOverview.tsx             # Animated circular score gauge
  ScoreBreakdown.tsx            # Category score bars
  CompetitorTable.tsx           # Competitor comparison
  Recommendations.tsx           # AI recommendations cards
  ReviewInsights.tsx            # Review sentiment analysis
  ListingsOverview.tsx          # Tracked listings summary
  admin/                        # Admin-only UI (StatCard, EventsTable, charts…)
  dashboard/                    # Sidebar, UpgradeModal

lib/
  db/
    index.ts                    # Drizzle DB connection (postgres driver)
    schema.ts                   # profiles, analyses, scraped_pages, admin_events
  supabase/
    client.ts                   # Browser client
    server.ts                   # Server client (cookies)
    middleware.ts               # Session refresh helper
  auth/
    roles.ts                    # Role helpers
    admin-guard.ts              # Server guard for admin routes
  stripe/
    index.ts                    # Stripe SDK singleton
    prices.ts                   # Price ID → plan mapping
  plans.ts                      # Plan metadata
  plan-features.ts              # Feature gates per plan
  ai/
    provider.ts                 # AI provider abstraction (Anthropic + OpenAI)
  viator/
    client.ts                   # Viator API HTTP client
    products.ts                 # Product fetch + competitor search
    reviews.ts                  # Reviews fetching
    types.ts                    # TypeScript interfaces
  scraping/
    scraper-factory.ts          # Picks scraper implementation
    merge.ts                    # Merge scraped + API data
    types.ts
    viator/                     # Viator scraper (selectors, urls, scraper)
    utils/                      # browser, proxy, anti-detect, cache, retry
  analysis/
    scoring.ts                  # 6-category scoring engine
    recommendations.ts          # AI integration (recommendations + insights)
  admin/
    events.ts                   # Admin event logging

middleware.ts                   # Top-level Next middleware (Supabase session)
drizzle/                        # Generated migrations
scripts/                        # One-off maintenance scripts
```

## Architecture & Data Flow

1. User submits Viator URL/product code via `AnalyzeForm`.
2. `POST /api/analyze` creates an analysis row (status: `processing`), starts async processing, returns `analysisId`. If the user is signed in, `user_id` is attached.
3. Client redirects to `/report/[id]` and polls `GET /api/report/[id]` every 2 seconds.
4. Async `processAnalysis()`:
   - Fetches product from Viator API (or scraper fallback via `scraper-factory`)
   - Searches top 10 competitors (same destination + category)
   - Calculates scores across 6 categories
   - Fetches reviews (operator + top 3 competitors)
   - Calls AI provider in parallel for recommendations + review insights
   - Updates row with results (status: `completed`)
5. Client renders results when status is `completed`.
6. Signed-in clients see their analyses in `/dashboard`; admins see everything in `/admin`.

Auth flow: Supabase session cookie is refreshed in `middleware.ts`. Server components read the session via `lib/supabase/server.ts`. Role comes from `profiles.role`; admin pages are gated by `lib/auth/admin-guard.ts`.

Billing flow: `/api/stripe/checkout` creates a Checkout session for a plan; on success the Stripe webhook updates `profiles.plan` and `profiles.stripe_customer_id`. `/api/stripe/portal` launches the Customer Portal.

## Database Schema

Tables (see `lib/db/schema.ts`):

### `profiles`
Mirrors Supabase `auth.users` by id. **No email column — email lives in `auth.users`.**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, matches `auth.users.id` |
| role | enum | `admin` / `client` (default `client`) |
| plan | enum | `free` / `growth` / `pro` (default `free`) |
| full_name | text | optional |
| company_name | text | optional |
| stripe_customer_id | text | set on first checkout |
| created_at | timestamp | default now |

### `analyses`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK auto |
| user_id | uuid | nullable (anonymous analyses allowed) |
| viator_product_code | varchar(20) | required |
| product_title | text | populated after fetch |
| status | varchar(20) | `pending` / `processing` / `completed` / `failed` |
| overall_score | integer | 0-100 weighted |
| scores | jsonb | per-category scores |
| product_data | jsonb | full Viator response |
| competitors_data | jsonb | CompetitorData[] |
| recommendations | jsonb | AIRecommendation[] |
| review_insights | jsonb | ReviewInsight |
| listings | jsonb | DiscoveredListing[] |
| data_source | varchar(20) | `api` / `scraper` / mixed |
| progress | jsonb | `{ step, percent, message }` |
| created_at | timestamp | default now |
| completed_at | timestamp | set on completion |

### `scraped_pages`
HTML + parsed cache, keyed by URL, with `expires_at` TTL. Used by the scraping layer.

### `admin_events`
Append-only log of admin/system events (`event`, `metadata` jsonb, `created_at`), indexed by `(event, created_at)`.

## Scoring System

Weighted overall score (0-100):

| Category | Weight | Key Criteria |
|----------|--------|-------------|
| Title Quality | 15% | Length (50-80 chars optimal), location, USP keywords, competitor keyword coverage |
| Description | 15% | Word count (300+ optimal), section presence, keyword richness |
| Pricing | 20% | Position vs competitor median (within ±10% = 100) |
| Reviews | 25% | Rating vs competitor avg, review count vs median |
| Photos | 15% | Absolute count (12+ = max), ratio vs competitor median |
| Completeness | 10% | Inclusions, exclusions, itinerary, cancellation policy, languages |

## Environment Variables

Required in `.env.local` for local dev (prod values live in Vercel only):

```
# Viator
VIATOR_API_KEY=
VIATOR_BASE_URL=https://api.viator.com/partner

# AI
ANTHROPIC_API_KEY=
# (OpenAI key optional — provider.ts selects per task)

# Supabase (dev project)
DATABASE_URL=                         # Pooler connection string (port 5432, pgBouncer)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Scraping
ZENROWS_API_KEY=

# Stripe (test mode locally)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_GROWTH_MONTHLY=
STRIPE_PRICE_GROWTH_YEARLY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** the local `DATABASE_URL` points to the dev Supabase project. The production Supabase project is separate and its credentials are only configured in Vercel. Never run `db:push` or destructive SQL against production from a local shell — make schema changes in dev, generate migrations, and apply them via Vercel / Supabase dashboard.

## Coding Conventions

- **Imports**: always use `@/` path alias
- **Components**: PascalCase filenames, `"use client"` for interactive
- **Functions**: camelCase
- **Types**: PascalCase interfaces; Viator types in `lib/viator/types.ts`
- **API Routes**: `NextRequest`/`NextResponse` from `next/server`; return 400/404/500 appropriately
- **DB Queries**: Drizzle query builder
- **Auth in routes**: load session via `lib/supabase/server.ts`; for admin routes use `lib/auth/admin-guard.ts`
- **Async**: `Promise.all` for parallel work, fire-and-forget for background processing

## Design System

- **Theme**: dark (navy `#0F172A`, light text)
- **Primary**: electric blue `#0EA5E9`
- **Cards**: glassmorphism (`.glass`)
- **Animations**: Framer Motion entrance + viewport effects
- **Utilities**: `.glass`, `.noise`, `.text-balance`
- **Tailwind v4**: `@theme` directive in `globals.css`
- Admin pages have an extra `app/admin/theme.css` overlay

## Key Types

```typescript
// Analysis (lib/viator/types.ts)
ViatorProduct
CompetitorData
ProductScores           // { title, description, pricing, reviews, photos, completeness, overall }
AIRecommendation        // { priority, category, title, description, impact }
ReviewInsight           // { positives, negatives, sentiment, keyPhrases, opportunities }
DiscoveredListing

// DB (lib/db/schema.ts)
Profile / NewProfile
Analysis / NewAnalysis
```

## Notes

- No automated tests — verify manually in the browser.
- AI provider is abstracted in `lib/ai/provider.ts`; prompts are concatenated into a single user message and parsed via regex (`/\[[\s\S]*\]/` for arrays, `/\{[\s\S]*\}/` for objects).
- Viator API tags can be numbers or objects depending on endpoint (union type).
- Background processing is fire-and-forget (`.catch()` without `await`).
- Anonymous analyses are supported; a `RegisterModal` prompts the user to create an account after viewing a report.
- Plan gating lives in `lib/plan-features.ts` — consult it before adding paywalled features.
- When inserting into `profiles` manually, do not include `email` (it's not a column — use `auth.users`).
