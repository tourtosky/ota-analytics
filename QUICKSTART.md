# Peregrio — Quick Start Guide

## The Error You're Seeing

If you see **"Failed to start analysis"** on the landing page, it's because the app needs:
1. ✅ Viator API key
2. ✅ Anthropic API key
3. ✅ PostgreSQL database

Don't worry — everything is built and ready. You just need to configure it!

---

## 3-Step Setup (5 minutes)

### Step 1: Get Your API Keys

#### A. Viator API Key

**Option 1: Use Sandbox for Testing (Immediate)**
- The Viator sandbox is perfect for testing without waiting for approval
- Sandbox URL: `https://api.sandbox.viator.com/partner`
- Contact Viator support or check your partner dashboard for sandbox credentials

**Option 2: Apply for Production Access**
1. Go to [Viator Partner API](https://www.viator.com/partner-api)
2. Fill out the application (takes 1-2 business days for approval)
3. Get your production API key from the dashboard

**For now, you can test with mock data or wait for API access.**

#### B. Anthropic API Key (2 minutes)

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Click "Get API Keys" → "Create Key"
4. Copy the key (starts with `sk-ant-...`)
5. Add $5-10 credits to your account

### Step 2: Configure Environment Variables

Open `.env.local` and update with your actual keys:

```bash
# .env.local

# Viator API Configuration
VIATOR_API_KEY=your_actual_viator_key_here
VIATOR_BASE_URL=https://api.viator.com/partner
# Or for sandbox: https://api.sandbox.viator.com/partner

# Anthropic API Configuration
ANTHROPIC_API_KEY=sk-ant-your_actual_key_here

# Database Configuration (update username/password)
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/peregrio
```

### Step 3: Set Up the Database

```bash
# Create the database
createdb peregrio

# Push the schema
npm run db:push
```

---

## Test It Out!

1. **Restart the dev server:**
   ```bash
   npm run dev
   ```

2. **Open** [http://localhost:3000](http://localhost:3000)

3. **Get a test Viator URL:**
   - Go to [Viator.com](https://www.viator.com)
   - Search for any tour (e.g., "Eiffel Tower tour")
   - Copy the URL (looks like: `https://www.viator.com/tours/Paris/Skip-the-Line-Eiffel-Tower-Tour/d479-12345P6`)

4. **Paste it in Peregrio and click "Analyze"**

5. **Wait 20-30 seconds** while it:
   - Fetches your tour data from Viator
   - Finds your top 10 competitors
   - Analyzes reviews
   - Generates AI recommendations

6. **View your report!** 🎉

---

## Alternative: Test Without Viator API (Development Mode)

If you don't have a Viator API key yet, you can create a mock mode for testing:

### Quick Mock Implementation

Create a file `lib/viator/mock.ts`:

```typescript
// Mock data for testing without Viator API
export const MOCK_PRODUCT = {
  productCode: "MOCK123P1",
  title: "Paris Eiffel Tower Skip-the-Line Tour",
  description: "Experience the magic of Paris with our exclusive skip-the-line access to the Eiffel Tower. This 3-hour guided tour takes you through the history and architecture of this iconic landmark, with breathtaking views from the second floor observation deck.",
  images: [
    { url: "https://picsum.photos/720/480?random=1", variants: [] },
    { url: "https://picsum.photos/720/480?random=2", variants: [] },
    { url: "https://picsum.photos/720/480?random=3", variants: [] },
  ],
  pricing: { currency: "USD", price: 89 },
  reviews: { totalReviews: 247, combinedAverageRating: 4.6 },
  tags: [{ ref: "TOURS", name: "Tours" }],
  destinations: [{ ref: "PARIS", name: "Paris" }],
  inclusions: ["Skip-the-line access", "Professional guide", "Audio headset"],
  exclusions: ["Hotel pickup", "Food and drinks"],
  itinerary: {
    itineraryItems: [
      { description: "Meet at the Eiffel Tower entrance" },
      { description: "Skip the line and ascend to the 2nd floor" },
      { description: "Guided tour with historical commentary" },
    ]
  },
  cancellationPolicy: { type: "STANDARD" },
  flags: [],
  status: "ACTIVE",
  languages: [{ code: "en", name: "English" }],
};

export const MOCK_COMPETITORS = [
  {
    productCode: "COMP1",
    title: "Private Eiffel Tower Tour with Summit Access",
    rating: 4.8,
    reviewCount: 512,
    price: 129,
    currency: "USD",
    photoCount: 12,
    flags: ["LIKELY_TO_SELL_OUT"],
  },
  {
    productCode: "COMP2",
    title: "Eiffel Tower Evening Tour with Champagne",
    rating: 4.7,
    reviewCount: 389,
    price: 99,
    currency: "USD",
    photoCount: 9,
  },
  // Add 8 more...
];
```

Then add a flag in `.env.local`:
```bash
USE_MOCK_DATA=true
```

---

## Common Issues & Fixes

### "Failed to start analysis"
- **Cause:** Missing API keys or database not set up
- **Fix:** Follow Step 2 and Step 3 above

### Database connection error
```bash
# Check PostgreSQL is running
pg_ctl status

# Or restart it
brew services restart postgresql
```

### "Invalid API key"
- Double-check there are no extra spaces in `.env.local`
- Make sure you copied the full key (Viator keys are long)
- For Anthropic, ensure it starts with `sk-ant-`

### Build errors
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

---

## What Happens During Analysis?

1. **Extract product code** from Viator URL (e.g., `12345P6`)
2. **Fetch your tour** using `/products/{code}`
3. **Find competitors** using `/products/search` (same destination + category)
4. **Fetch reviews** for you and top 3 competitors
5. **Calculate scores** across 6 dimensions
6. **Generate AI recommendations** using Claude
7. **Create report** and redirect you to results

**Total time: 20-30 seconds**

---

## Need Help?

1. **Check logs** in your terminal for detailed error messages
2. **Review SETUP.md** for detailed troubleshooting
3. **Verify API keys** are correct in `.env.local`
4. **Test database connection** with `psql peregrio`

---

## Next: Go Production! 🚀

Once everything works locally:

1. Deploy to your VPS or cloud provider
2. Set up production environment variables
3. Configure your production database
4. Add analytics tracking
5. Set up monitoring
6. Launch to customers!

**The hard part (building the app) is done. Now it's just configuration!** ✨
