"use client";

import { AIRecommendation } from "@/lib/viator/types";
import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, Info, Zap } from "lucide-react";

interface RecommendationsProps {
  recommendations: AIRecommendation[];
}

export default function Recommendations({ recommendations }: RecommendationsProps) {
  const getPriorityIcon = (p: AIRecommendation["priority"]) => {
    switch (p) {
      case "critical": return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "high": return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "medium": return <Info className="w-5 h-5 text-amber-500" />;
    }
  };

  const getPriorityBorder = (p: AIRecommendation["priority"]) => {
    switch (p) {
      case "critical": return "border-l-red-500";
      case "high": return "border-l-orange-500";
      case "medium": return "border-l-amber-500";
    }
  };

  const getPriorityBadge = (p: AIRecommendation["priority"]) => {
    switch (p) {
      case "critical": return "bg-red-50 text-red-700 border-red-200";
      case "high": return "bg-orange-50 text-orange-700 border-orange-200";
      case "medium": return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 className="text-xl font-display font-bold text-slate-900 mb-6">AI-Powered Recommendations</h3>

      <div className="space-y-4">
        {recommendations.map((rec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className={`rounded-xl p-6 border border-slate-200 border-l-4 ${getPriorityBorder(rec.priority)} bg-white`}
          >
            <div className="flex gap-4">
              <div className="flex-shrink-0 mt-0.5">{getPriorityIcon(rec.priority)}</div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="text-slate-900 font-bold">{rec.title}</h4>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPriorityBadge(rec.priority)}`}>
                      {rec.priority}
                    </span>
                    <span className="text-xs text-slate-400 uppercase font-medium whitespace-nowrap">{rec.category}</span>
                  </div>
                </div>
                <p className="text-slate-500 mb-3 leading-relaxed text-sm">{rec.description}</p>
                <div className="rounded-lg p-3 bg-slate-50 border border-slate-100">
                  <p className="text-sm text-slate-500 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-600" />
                    <span className="text-cyan-700 font-semibold">Expected Impact:</span>{" "}
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
