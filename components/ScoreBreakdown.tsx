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
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const categories = [
    { label: "Title Quality", key: "title" as const },
    { label: "Description", key: "description" as const },
    { label: "Pricing", key: "pricing" as const },
    { label: "Reviews", key: "reviews" as const },
    { label: "Photos", key: "photos" as const },
    { label: "Completeness", key: "completeness" as const },
  ];

  return (
    <div className="glass rounded-2xl p-8">
      <h3 className="text-2xl font-display font-bold text-white mb-8">
        Score Breakdown
      </h3>

      <div className="space-y-6">
        {categories.map((category, index) => {
          const score = scores[category.key];
          return (
            <motion.div
              key={category.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300 font-semibold">
                  {category.label}
                </span>
                <span
                  className={`font-mono font-bold text-xl ${getScoreTextColor(
                    score
                  )}`}
                >
                  {score}
                  <span className="text-gray-500 text-sm">/100</span>
                </span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${getScoreColor(score)} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 1, delay: index * 0.1 + 0.2 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
