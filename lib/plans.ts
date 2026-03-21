export const PLAN_LIMITS = {
  free: 1,
  growth: 5,
  pro: Infinity,
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  growth: "Growth",
  pro: "Pro",
};
