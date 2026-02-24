"use client";

import { motion } from "framer-motion";

interface ScoreOverviewProps {
  score: number;
}

export default function ScoreOverview({ score }: ScoreOverviewProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent 🟢";
    if (score >= 60) return "Good 🟡";
    if (score >= 40) return "Needs Work ⚠️";
    return "Critical Issues 🔴";
  };

  const strokeColor = (score: number) => {
    if (score >= 80) return "#4ade80";
    if (score >= 60) return "#facc15";
    if (score >= 40) return "#fb923c";
    return "#f87171";
  };

  const circumference = 2 * Math.PI * 88;
  const strokeDashoffset = circumference * (1 - score / 100);

  return (
    <div className="glass rounded-2xl p-8 flex flex-col items-center">
      <h3 className="text-2xl font-display font-bold text-white mb-8">
        Overall Score
      </h3>

      <div className="relative mb-6">
        <svg className="w-64 h-64 transform -rotate-90">
          <circle
            cx="128"
            cy="128"
            r="88"
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className="text-white/10"
          />
          <motion.circle
            cx="128"
            cy="128"
            r="88"
            stroke={strokeColor(score)}
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            strokeLinecap="round"
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className={`text-7xl font-mono font-bold ${getScoreColor(score)}`}
            >
              {score}
            </motion.div>
            <div className="text-gray-400 text-xl font-mono">/100</div>
          </div>
        </div>
      </div>

      <p className="text-xl text-gray-300 font-semibold">
        {getScoreLabel(score)}
      </p>
    </div>
  );
}
