"use client";

import { motion } from "framer-motion";

interface ScoreOverviewProps {
  score: number;
}

export default function ScoreOverview({ score }: ScoreOverviewProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-emerald-600";
    if (s >= 60) return "text-amber-600";
    if (s >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return "Excellent";
    if (s >= 60) return "Good";
    if (s >= 40) return "Needs Work";
    return "Critical";
  };

  const getScoreBadge = (s: number) => {
    if (s >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
    if (s >= 40) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  const strokeColors = (s: number) => {
    if (s >= 80) return { start: "#059669", end: "#10b981" };
    if (s >= 60) return { start: "#d97706", end: "#f59e0b" };
    if (s >= 40) return { start: "#ea580c", end: "#f97316" };
    return { start: "#dc2626", end: "#ef4444" };
  };

  const colors = strokeColors(score);
  const circumference = 2 * Math.PI * 88;
  const strokeDashoffset = circumference * (1 - score / 100);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 flex flex-col items-center shadow-sm">
      <h3 className="text-xl font-display font-bold text-slate-900 mb-8">Overall Score</h3>

      <div className="relative mb-6">
        <svg className="w-56 h-56 transform -rotate-90">
          <circle cx="112" cy="112" r="88" stroke="#f1f5f9" strokeWidth="10" fill="none" />
          <motion.circle
            cx="112" cy="112" r="88"
            stroke="url(#scoreGrad)"
            strokeWidth="10" fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            strokeLinecap="round"
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.start} />
              <stop offset="100%" stopColor={colors.end} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className={`text-6xl font-mono font-bold ${getScoreColor(score)}`}
            >
              {score}
            </motion.div>
            <div className="text-slate-300 text-lg font-mono">/100</div>
          </div>
        </div>
      </div>

      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border ${getScoreBadge(score)}`}>
        {getScoreLabel(score)}
      </span>
    </div>
  );
}
