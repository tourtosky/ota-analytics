"use client";

import { AIRecommendation } from "@/lib/viator/types";
import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

interface RecommendationsProps {
  recommendations: AIRecommendation[];
}

export default function Recommendations({
  recommendations,
}: RecommendationsProps) {
  const getPriorityIcon = (priority: AIRecommendation["priority"]) => {
    switch (priority) {
      case "critical":
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case "high":
        return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      case "medium":
        return <Info className="w-6 h-6 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: AIRecommendation["priority"]) => {
    switch (priority) {
      case "critical":
        return "border-red-500 bg-red-500/5";
      case "high":
        return "border-orange-500 bg-orange-500/5";
      case "medium":
        return "border-yellow-500 bg-yellow-500/5";
    }
  };

  const getPriorityEmoji = (priority: AIRecommendation["priority"]) => {
    switch (priority) {
      case "critical":
        return "🔴";
      case "high":
        return "⚠️";
      case "medium":
        return "🟡";
    }
  };

  return (
    <div className="glass rounded-2xl p-8">
      <h3 className="text-2xl font-display font-bold text-white mb-6">
        AI-Powered Recommendations
      </h3>

      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className={`glass rounded-xl p-6 border-l-4 ${getPriorityColor(
              rec.priority
            )}`}
          >
            <div className="flex gap-4">
              <div className="flex-shrink-0 mt-1">
                {getPriorityIcon(rec.priority)}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="text-white font-bold text-lg">
                    {getPriorityEmoji(rec.priority)} {rec.title}
                  </h4>
                  <span className="text-xs text-gray-400 uppercase font-semibold whitespace-nowrap">
                    {rec.category}
                  </span>
                </div>
                <p className="text-gray-300 mb-3 leading-relaxed">
                  {rec.description}
                </p>
                <div className="glass rounded-lg p-3 bg-white/5">
                  <p className="text-sm text-gray-400">
                    <span className="text-primary font-semibold">
                      Expected Impact:
                    </span>{" "}
                    {rec.impact}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
