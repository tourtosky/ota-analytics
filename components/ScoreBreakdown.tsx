"use client";

import { motion } from "framer-motion";

interface ScoreBreakdownProps {
  scores: {
    title: number;
    description: number;
    pricing: number;
    reviews: number;
    photos: number;
    completeness: number;
  };
}

export default function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  const getBarColor = (s: number) => {
    if (s >= 80) return "from-emerald-500 to-emerald-400";
    if (s >= 60) return "from-amber-500 to-amber-400";
    if (s >= 40) return "from-orange-500 to-orange-400";
    return "from-red-500 to-red-400";
  };

  const getTextColor = (s: number) => {
    if (s >= 80) return "text-emerald-600";
    if (s >= 60) return "text-amber-600";
    if (s >= 40) return "text-orange-600";
    return "text-red-500";
  };

  const categories = [
    { label: "Title Quality", key: "title" as const, weight: "15%" },
    { label: "Description", key: "description" as const, weight: "15%" },
    { label: "Pricing", key: "pricing" as const, weight: "20%" },
    { label: "Reviews", key: "reviews" as const, weight: "25%" },
    { label: "Photos", key: "photos" as const, weight: "15%" },
    { label: "Completeness", key: "completeness" as const, weight: "10%" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 className="text-xl font-display font-bold text-slate-900 mb-8">Score Breakdown</h3>

      <div className="space-y-5">
        {categories.map((cat, i) => {
          const s = scores[cat.key];
          return (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium text-sm">{cat.label}</span>
                  <span className="text-slate-300 text-xs font-mono">{cat.weight}</span>
                </div>
                <span className={`font-mono font-bold text-lg ${getTextColor(s)}`}>{s}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${getBarColor(s)} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${s}%` }}
                  transition={{ duration: 1, delay: i * 0.1 + 0.2 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
