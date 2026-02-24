# TourBoost — Viator Listing Optimization & Analytics

**TourBoost** is a SaaS tool that helps tour operators analyze and optimize their Viator listings by comparing them against competitors. Enter your Viator product URL/ID, and TourBoost fetches competitor data, scores your listing across 6 dimensions, and provides AI-powered recommendations to increase bookings.

## 📊 Project Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Code** | ✅ 100% Complete | All features built and tested |
| **Build** | ✅ Passing | Production build successful |
| **Configuration** | ⚠️ Needs API Keys | See [QUICKSTART.md](QUICKSTART.md) |
| **Ready to Launch** | ✅ Yes | After API configuration |

**Quick Start:** Run `npm run check` to see what needs to be configured.

---

## 🚀 Features

- **Competitor Intelligence** — Compare your tour against the top 10 competitors in your category and location
- **Listing Score (0-100)** — Get quantified scores across 6 dimensions: title, description, pricing, reviews, photos, and completeness
- **AI-Powered Recommendations** — Receive specific, actionable suggestions based on what's actually working for competitors
- **Review Sentiment Analysis** — Understand what travelers love about top competitors and where they complain
- **Keyword Gap Analysis** — Discover high-converting keywords your competitors use that you're missing
- **Data-Driven Pricing** — See where your price sits vs the market median

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL with Drizzle ORM
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514)
- **External API:** Viator Partner API v2.0
- **Deployment:** Node.js on VPS (no Vercel-specific features)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tourboost.git
   cd tourboost
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the example env file and fill in your API keys:
   ```bash
   cp .env.local.example .env.local
   ```

   Required variables:
   ```env
   VIATOR_API_KEY=your_viator_api_key_here
   VIATOR_BASE_URL=https://api.viator.com/partner
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   DATABASE_URL=postgresql://user:password@localhost:5432/tourboost
   ```

4. **Set up the database**

   Create a PostgreSQL database, then run:
   ```bash
   npm run db:generate  # Generate migration files
   npm run db:push      # Push schema to database
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗄️ Database Schema

The app uses a single `analyses` table:

```sql
CREATE TABLE analyses (
  id UUID PRIMARY KEY,
  viator_product_code VARCHAR(20) NOT NULL,
  product_title TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  overall_score INTEGER,
  scores JSONB,
  product_data JSONB,
  competitors_data JSONB,
  recommendations JSONB,
  review_insights JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

## 🔌 API Endpoints

### `POST /api/analyze`
Start a new analysis for a Viator product.

**Request:**
```json
{
  "productCode": "12345P6"
}
```

**Response:**
```json
{
  "analysisId": "uuid-here"
}
```

### `GET /api/report/[id]`
Fetch the analysis results.

**Response:**
```json
{
  "id": "uuid",
  "viatorProductCode": "12345P6",
  "productTitle": "Tour Title",
  "status": "completed",
  "overallScore": 67,
  "scores": {
    "title": 45,
    "description": 52,
    "pricing": 78,
    "reviews": 82,
    "photos": 35,
    "completeness": 71
  },
  "productData": {...},
  "competitorsData": [...],
  "recommendations": [...],
  "reviewInsights": {...},
  "createdAt": "2026-02-24T...",
  "completedAt": "2026-02-24T..."
}
```

## 🎨 Design Principles

- **Dark theme** (deep navy #0F172A) with electric blue accent (#0EA5E9)
- **Premium fonts:**
  - Display: Playfair Display (headings)
  - Body: Plus Jakarta Sans
  - Monospace: JetBrains Mono (data/numbers)
- **Glassmorphism** cards with subtle backdrop-blur
- **Noise texture** overlay for depth
- **Color-coded scores:**
  - 🟢 80-100: Excellent (green)
  - 🟡 60-79: Good (yellow)
  - ⚠️ 40-59: Needs work (orange)
  - 🔴 0-39: Critical issues (red)

## 📊 Scoring Algorithm

Each category is scored 0-100, then weighted to calculate the overall score:

| Category | Weight | Criteria |
|---|---|---|
| **Title Quality** | 15% | Length (50-80 chars optimal), location, USPs, keyword density |
| **Description** | 15% | Length (>300 words), key sections, keyword coverage |
| **Pricing** | 20% | Position vs competitor median (±10% optimal) |
| **Reviews** | 25% | Rating vs avg, count vs median, recency |
| **Photos** | 15% | Count (6+ good, 9+ excellent) vs competitor median |
| **Completeness** | 10% | Inclusions, exclusions, itinerary, cancellation policy, languages |

## 🤖 AI Recommendations

The app uses Claude to generate 5-7 specific, actionable recommendations based on:
- Your product data vs competitor benchmarks
- Negative/neutral reviews from your listing
- Positive themes from top competitor reviews
- Competitor complaints (your opportunities)

Each recommendation includes:
- Priority level (critical/high/medium)
- Category (title/description/pricing/reviews/photos/completeness)
- Specific action to take
- Expected impact on bookings

## 🚧 Roadmap

- [ ] User authentication & usage limits
- [ ] Support for GetYourGuide
- [ ] Support for Airbnb Experiences
- [ ] Historical tracking (track scores over time)
- [ ] Email reports
- [ ] Bulk analysis for tour operators with multiple listings

## 📝 License

MIT

## 🙏 Credits

Built with [Next.js](https://nextjs.org/), [Tailwind CSS](https://tailwindcss.com/), [Drizzle ORM](https://orm.drizzle.team/), and [Anthropic Claude](https://www.anthropic.com/).

Market data from [Arival](https://arival.travel/).

---

**TourBoost** — Built for tour operators who want to dominate Viator.
