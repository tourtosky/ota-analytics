# TourBoost — Viator Listing Optimization & Analytics

**TourBoost** is a SaaS tool that helps tour operators analyze and optimize their Viator listings by comparing them against top competitors. Paste a Viator product URL or ID, and TourBoost fetches competitor data, scores the listing across 6 dimensions, and generates AI-powered recommendations to increase bookings.

Live at **[peregrio.com](https://peregrio.com)**.

---

## 🚀 Features

- **Competitor Intelligence** — Compare your tour against the top 10 competitors in your category and location
- **Listing Score (0-100)** — Quantified scores across 6 dimensions: title, description, pricing, reviews, photos, completeness
- **AI-Powered Recommendations** — Specific, actionable suggestions based on what works for competitors
- **Review Sentiment Analysis** — What travelers love about top competitors and where they complain
- **Keyword Gap Analysis** — High-converting keywords competitors use that you're missing
- **Data-Driven Pricing** — Where your price sits vs the market median
- **Client Dashboard** — Track listings, view past analyses, manage subscription
- **Admin Dashboard** — Manage clients, plans, API usage, and scraping jobs
- **Subscription Plans** — Free, Growth, Pro tiers via Stripe Checkout + Customer Portal

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS 4 + Framer Motion
- **Database:** Supabase PostgreSQL + Drizzle ORM
- **Auth:** Supabase Auth (`@supabase/ssr`)
- **Payments:** Stripe (Checkout, Customer Portal, webhooks)
- **AI:** Anthropic Claude (`claude-sonnet-4-20250514`) + OpenAI (`gpt-4o-mini`) via a shared provider abstraction
- **External APIs:** Viator Partner API v2.0; ZenRows + Playwright for scraping fallback
- **Hosting:** Vercel

## 📦 Local Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/yourusername/tourboost.git
   cd tourboost
   npm install
   ```

2. **Configure environment variables**

   Copy the example file and fill it in:
   ```bash
   cp .env.local.example .env.local
   ```

   Required keys:
   ```env
   # Viator
   VIATOR_API_KEY=
   VIATOR_BASE_URL=https://api.viator.com/partner

   # AI
   ANTHROPIC_API_KEY=

   # Supabase (dev project)
   DATABASE_URL=                         # Pooler connection string
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=

   # Scraping
   ZENROWS_API_KEY=

   # Stripe (test mode)
   STRIPE_SECRET_KEY=
   STRIPE_PUBLISHABLE_KEY=
   STRIPE_WEBHOOK_SECRET=
   STRIPE_PRICE_GROWTH_MONTHLY=
   STRIPE_PRICE_GROWTH_YEARLY=
   STRIPE_PRICE_PRO_MONTHLY=
   STRIPE_PRICE_PRO_YEARLY=

   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Push the schema to your dev Supabase project**
   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## 🌐 Deployment

- Production is deployed on **Vercel** and served at **peregrio.com**.
- Production uses a **separate Supabase project** from dev. Its credentials and all live secrets (Stripe live keys, production `DATABASE_URL`, service role keys, etc.) are configured **only in Vercel project settings** — they are intentionally not stored in `.env.local`.
- **Do not run `npm run db:push` against production.** Schema changes should be generated against the dev DB, committed as Drizzle migrations, and applied to production via the Supabase dashboard or a controlled deploy step.

## 🗄️ Database Schema

Tables (see `lib/db/schema.ts`):

- **`profiles`** — mirrors Supabase `auth.users` by id; stores `role` (`admin`/`client`), `plan` (`free`/`growth`/`pro`), `full_name`, `company_name`, `stripe_customer_id`. **No `email` column — email lives in `auth.users`.**
- **`analyses`** — analysis records: `user_id` (nullable, anonymous supported), `viator_product_code`, `status`, `overall_score`, `scores`, `product_data`, `competitors_data`, `recommendations`, `review_insights`, `listings`, `data_source`, `progress`.
- **`scraped_pages`** — URL-keyed HTML + parsed JSON cache with `expires_at` TTL.
- **`admin_events`** — append-only event log for admin/system actions.

## 🔌 API Endpoints

### Analysis
- `POST /api/analyze` — start a new analysis. Body: `{ "productCode": "12345P6" }`. Returns `{ "analysisId": "..." }`.
- `GET /api/report/[id]` — fetch analysis results (client polls until `status === "completed"`).

### Auth / Dashboard
- `GET /api/auth/me` — current user + profile
- `GET /api/dashboard/analyses` — current user's analyses
- `GET|PATCH /api/dashboard/profile` — profile read/update

### Admin (role=admin required)
- `GET /api/admin/stats`
- `GET|PATCH /api/admin/clients`
- `GET /api/admin/analysis`

### Stripe
- `POST /api/stripe/checkout` — create a Checkout session
- `POST /api/stripe/portal` — create a Customer Portal session
- `POST /api/stripe/webhook` — webhook handler (syncs plan → `profiles.plan`)

## 🎨 Design Principles

- **Dark theme** (deep navy `#0F172A`) with electric blue accent (`#0EA5E9`)
- **Fonts:** Playfair Display (headings), Plus Jakarta Sans (body), JetBrains Mono (data/numbers)
- **Glassmorphism** cards with subtle backdrop-blur
- **Noise texture** overlay for depth
- **Color-coded scores:** 80-100 excellent, 60-79 good, 40-59 needs work, 0-39 critical

## 📊 Scoring Algorithm

| Category | Weight | Criteria |
|---|---|---|
| **Title Quality** | 15% | Length (50-80 chars optimal), location, USPs, keyword coverage |
| **Description** | 15% | Length (300+ words), key sections, keyword richness |
| **Pricing** | 20% | Position vs competitor median (±10% optimal) |
| **Reviews** | 25% | Rating vs avg, count vs median |
| **Photos** | 15% | Count (12+ max) vs competitor median |
| **Completeness** | 10% | Inclusions, exclusions, itinerary, cancellation policy, languages |

## 🤖 AI Recommendations

Claude generates 5-7 prioritized recommendations based on:
- Product data vs competitor benchmarks
- Negative / neutral reviews from the listing
- Positive themes from top competitor reviews
- Competitor complaints (i.e. your opportunities)

Each recommendation has: priority (`critical`/`high`/`medium`), category, specific action, expected impact.

## 🚧 Roadmap

- [x] User authentication (Supabase Auth)
- [x] Paid plans via Stripe
- [x] Client dashboard
- [x] Admin dashboard
- [x] Viator scraper fallback
- [ ] Support for GetYourGuide
- [ ] Support for Airbnb Experiences
- [ ] Historical score tracking over time
- [ ] Email reports
- [ ] Bulk analysis

## 📝 License

MIT

## 🙏 Credits

Built with [Next.js](https://nextjs.org/), [Tailwind CSS](https://tailwindcss.com/), [Supabase](https://supabase.com/), [Drizzle ORM](https://orm.drizzle.team/), [Stripe](https://stripe.com/), and [Anthropic Claude](https://www.anthropic.com/).

---

**TourBoost** — Built for tour operators who want to dominate Viator.
