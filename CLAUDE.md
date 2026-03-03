# CLAUDE.md - TourBoost

## Project Overview

TourBoost is a SaaS application that helps tour operators optimize their Viator listings. It analyzes a listing against top competitors in the same destination/category, produces a 0-100 score across 6 categories, and generates AI-powered recommendations to improve bookings.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 + Framer Motion for animations
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`)
- **External API**: Viator Partner API v2.0
- **Icons**: Lucide React
- **Fonts**: Plus Jakarta Sans (body), Playfair Display (headings), JetBrains Mono (code/numbers)

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Run production server
npm run lint         # ESLint (extends next/core-web-vitals)
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema to PostgreSQL
npm run db:studio    # Open Drizzle Studio GUI
npm run check        # Verify setup (check-setup.js)
```

## Project Structure

```
app/
  layout.tsx                    # Root layout (fonts, metadata)
  page.tsx                      # Landing page (hero, features, CTA)
  globals.css                   # Tailwind v4 theme + custom utilities
  api/
    analyze/route.ts            # POST - starts async analysis
    report/[id]/route.ts        # GET - returns analysis results
  report/[id]/page.tsx          # Report display page (polls for results)

components/
  AnalyzeForm.tsx               # URL input form + product code extraction
  ScoreOverview.tsx             # Animated circular score gauge
  ScoreBreakdown.tsx            # Category score bars
  CompetitorTable.tsx           # Competitor comparison table
  Recommendations.tsx           # AI recommendations cards
  ReviewInsights.tsx            # Review sentiment analysis display

lib/
  db/
    index.ts                    # Drizzle DB connection (postgres driver)
    schema.ts                   # PostgreSQL schema (analyses table)
  viator/
    client.ts                   # Viator API HTTP client
    products.ts                 # Product fetch + competitor search
    reviews.ts                  # Reviews fetching
    types.ts                    # All TypeScript interfaces
  analysis/
    scoring.ts                  # 6-category scoring engine
    recommendations.ts          # Claude AI integration (recommendations + insights)
```

## Architecture & Data Flow

1. User submits Viator URL/product code via `AnalyzeForm`
2. `POST /api/analyze` creates a DB record (status: "processing"), starts async processing, returns `analysisId`
3. Client redirects to `/report/[id]` and polls `GET /api/report/[id]` every 2 seconds
4. Async `processAnalysis()` runs:
   - Fetches product from Viator API
   - Searches top 10 competitors (same destination + category)
   - Calculates scores across 6 categories
   - Fetches reviews (operator + top 3 competitors)
   - Calls Claude API in parallel for recommendations and review insights
   - Updates DB with results (status: "completed")
5. Client renders results when status is "completed"

## Database Schema

Single table: `analyses`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, auto-generated |
| viator_product_code | varchar(20) | Required |
| product_title | text | Populated after fetch |
| status | varchar(20) | "pending" / "processing" / "completed" / "failed" |
| overall_score | integer | 0-100 weighted score |
| scores | jsonb | `{ title, description, pricing, reviews, photos, completeness }` |
| product_data | jsonb | Full Viator product response |
| competitors_data | jsonb | Array of CompetitorData |
| recommendations | jsonb | Array of AIRecommendation |
| review_insights | jsonb | ReviewInsight object |
| created_at | timestamp | Auto-set |
| completed_at | timestamp | Set on completion |

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

Required in `.env.local` (see `.env.local.example`):

```
VIATOR_API_KEY=         # Viator Partner API key
VIATOR_BASE_URL=        # https://api.viator.com/partner
ANTHROPIC_API_KEY=      # Anthropic API key for Claude
DATABASE_URL=           # PostgreSQL connection string
```

## Coding Conventions

- **Imports**: Always use `@/` path alias (e.g., `import { db } from "@/lib/db"`)
- **Components**: PascalCase filenames, `"use client"` directive for interactive components
- **Functions**: camelCase (e.g., `fetchProduct`, `calculateScores`)
- **Types**: PascalCase interfaces, all defined in `lib/viator/types.ts`
- **API Routes**: Use `NextRequest`/`NextResponse` from `next/server`
- **Error Handling**: Try-catch in API routes, return appropriate status codes (400/404/500)
- **DB Queries**: Drizzle query builder pattern (e.g., `db.insert(analyses).values({...}).returning()`)
- **Async patterns**: `Promise.all` for parallel operations, fire-and-forget for background processing

## Design System

- **Theme**: Dark (navy `#0F172A` background, light text)
- **Primary color**: Electric blue `#0EA5E9`
- **Card style**: Glassmorphism (`.glass` class - translucent + blur)
- **Animations**: Framer Motion entrance animations + viewport-triggered effects
- **Custom utilities**: `.glass` (glassmorphism), `.noise` (SVG noise overlay), `.text-balance`
- **Tailwind v4**: Uses `@theme` directive in `globals.css` for custom tokens

## Key Types

```typescript
// Core analysis types (lib/viator/types.ts)
ViatorProduct          // Full product data from Viator API
CompetitorData         // Simplified competitor info for comparison
ProductScores          // { title, description, pricing, reviews, photos, completeness, overall }
AIRecommendation       // { priority, category, title, description, impact }
ReviewInsight          // { positives, negatives, sentiment, keyPhrases, opportunities }

// DB types (lib/db/schema.ts)
Analysis               // InferSelectModel - full row type
NewAnalysis            // InferInsertModel - insert type
```

## Notes

- No automated tests currently exist - testing is manual via browser
- The Claude API integration uses `system prompt + user message` concatenated into a single user message
- Claude responses are parsed via regex (`/\[[\s\S]*\]/` for arrays, `/\{[\s\S]*\}/` for objects)
- Viator API tags can be numbers or objects depending on endpoint - handled with union type
- Background processing uses fire-and-forget pattern (`.catch()` without `await`)
- No authentication/authorization system yet - all analyses are public
