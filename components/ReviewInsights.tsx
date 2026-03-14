"use client";

import { ReviewInsight } from "@/lib/viator/types";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, Minus, Lightbulb, CircleDot } from "lucide-react";

interface ReviewInsightsProps {
  insights: ReviewInsight;
}

export default function ReviewInsights({ insights }: ReviewInsightsProps) {
  const getSentimentIcon = (s: ReviewInsight["sentiment"]) => {
    switch (s) {
      case "improving": return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case "declining": return <TrendingDown className="w-4 h-4 text-red-500" />;
      case "stable": return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSentimentBadge = (s: ReviewInsight["sentiment"]) => {
    switch (s) {
      case "improving": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "declining": return "bg-red-50 text-red-700 border-red-200";
      case "stable": return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 className="text-xl font-display font-bold text-slate-900 mb-6">Review Insights</h3>

      <div className="space-y-8">
        {/* Sentiment */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center gap-3">
          <span className="text-slate-500 text-sm">Sentiment trend:</span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${getSentimentBadge(insights.sentiment)}`}>
            {getSentimentIcon(insights.sentiment)}
            <span className="capitalize">{insights.sentiment}</span>
          </span>
        </motion.div>

        {/* Positives */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-4">
            <ThumbsUp className="w-5 h-5 text-emerald-500" />
            <h4 className="text-slate-900 font-bold">What travelers love about top competitors</h4>
          </div>
          <div className="space-y-2">
            {insights.positives.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg p-3 bg-slate-50 border border-slate-100">
                <span className="text-slate-600 text-sm">&ldquo;{item.theme}&rdquo;</span>
                <span className="text-emerald-700 font-mono font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded">{item.frequency}x</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Negatives */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-4">
            <ThumbsDown className="w-5 h-5 text-orange-500" />
            <h4 className="text-slate-900 font-bold">Opportunities (competitor complaints)</h4>
          </div>
          <div className="space-y-2">
            {insights.negatives.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg p-3 bg-slate-50 border border-slate-100">
                <span className="text-slate-600 text-sm">&ldquo;{item.theme}&rdquo;</span>
                <span className="text-orange-700 font-mono font-bold text-sm bg-orange-50 px-2 py-0.5 rounded">{item.frequency}x</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Key Phrases */}
        {insights.keyPhrases && insights.keyPhrases.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h4 className="text-slate-900 font-bold">Key phrases from 5-star reviews</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.keyPhrases.slice(0, 8).map((phrase, i) => (
                <span key={i} className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-sm text-slate-600 font-medium">
                  &ldquo;{phrase}&rdquo;
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Unmet Needs */}
        {insights.opportunities && insights.opportunities.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
            <h4 className="text-slate-900 font-bold mb-3">Unmet needs & product improvement ideas</h4>
            <ul className="space-y-2">
              {insights.opportunities.map((opp, i) => (
                <li key={i} className="flex items-start gap-2.5 text-slate-600 text-sm rounded-lg p-3 bg-slate-50 border border-slate-100">
                  <CircleDot className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <span>{opp}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  );
}
