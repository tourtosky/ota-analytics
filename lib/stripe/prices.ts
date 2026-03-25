export const STRIPE_PRICES = {
  growth: {
    monthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_GROWTH_YEARLY!,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY!,
  },
} as const;

// Reverse lookup: price_id → plan name
export function getPlanFromPriceId(priceId: string): "growth" | "pro" | null {
  for (const [plan, prices] of Object.entries(STRIPE_PRICES)) {
    if (prices.monthly === priceId || prices.yearly === priceId) {
      return plan as "growth" | "pro";
    }
  }
  return null;
}
