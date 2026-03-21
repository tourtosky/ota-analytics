export const PLAN_FEATURES = {
  free: {
    included: ["1 listing analysis", "One-time audit", "Score breakdown (6 categories)", "Basic competitor snapshot (top 3)"],
    excluded: ["Full AI recommendations", "Competitor Radar", "Position tracking", "Weekly monitoring", "CSV export"],
  },
  growth: {
    included: ["Up to 5 listings", "Weekly monitoring", "Full AI recommendations", "Competitor Radar", "Position tracking", "CSV export"],
    excluded: ["Review Intelligence", "Seasonal repricing", "Daily monitoring", "API access"],
  },
  pro: {
    included: ["Unlimited listings", "Daily monitoring", "Everything in Growth", "Review Intelligence", "Seasonal repricing", "Priority support"],
    excluded: [],
  },
} as const;
