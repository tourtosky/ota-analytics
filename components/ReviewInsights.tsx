"use client";

import { ReviewInsight } from "@/lib/viator/types";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, Minus, Lightbulb } from "lucide-react";

interface ReviewInsightsProps {
  insights: ReviewInsight;
}

export default function ReviewInsights({ insights }: ReviewInsightsProps) {
  const getSentimentIcon = (sentiment: ReviewInsight["sentiment"]) => {
    switch (sentiment) {
      case "improving":
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      case "declining":
        return <TrendingDown className="w-5 h-5 text-red-400" />;
      case "stable":
        return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSentimentColor = (sentiment: ReviewInsight["sentiment"]) => {
    switch (sentiment) {
      case "improving":
        return "text-green-400";
      case "declining":
        return "text-red-400";
      case "stable":
        return "text-gray-400";
    }
  };

  return (
    <div className="glass rounded-2xl p-8">
      <h3 className="text-2xl font-display font-bold text-white mb-6">
        Review Insights
      </h3>

      <div className="space-y-8">
        {/* Sentiment Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="flex items-center gap-2">
            {getSentimentIcon(insights.sentiment)}
            <span className="text-gray-400">Your sentiment trend:</span>
          </div>
          <span
            className={`font-bold text-lg capitalize ${getSentimentColor(
              insights.sentiment
            )}`}
          >
            {insights.sentiment}
          </span>
        </motion.div>

        {/* What Travelers Love */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <ThumbsUp className="w-5 h-5 text-green-400" />
            <h4 className="text-white font-bold text-lg">
              What travelers love about top competitors:
            </h4>
          </div>
          <div className="space-y-2">
            {insights.positives.slice(0, 5).map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between glass rounded-lg p-3"
              >
                <span className="text-gray-300">
                  &ldquo;{item.theme}&rdquo;
                </span>
                <span className="text-green-400 font-mono font-bold">
                  {item.frequency}x
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Opportunities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <ThumbsDown className="w-5 h-5 text-orange-400" />
            <h4 className="text-white font-bold text-lg">
              Opportunities (competitor complaints):
            </h4>
          </div>
          <div className="space-y-2">
            {insights.negatives.slice(0, 5).map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between glass rounded-lg p-3"
              >
                <span className="text-gray-300">
                  &ldquo;{item.theme}&rdquo;
                </span>
                <span className="text-orange-400 font-mono font-bold">
                  {item.frequency}x
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Key Phrases for Marketing */}
        {insights.keyPhrases && insights.keyPhrases.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <h4 className="text-white font-bold text-lg">
                Key phrases from 5-star reviews:
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.keyPhrases.slice(0, 8).map((phrase, index) => (
                <span
                  key={index}
                  className="px-3 py-1 glass rounded-full text-sm text-gray-300"
                >
                  &ldquo;{phrase}&rdquo;
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Unmet Needs */}
        {insights.opportunities && insights.opportunities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <h4 className="text-white font-bold text-lg mb-3">
              Unmet needs & product improvement ideas:
            </h4>
            <ul className="space-y-2">
              {insights.opportunities.map((opportunity, index) => (
                <li
                  key={index}
                  className="text-gray-300 pl-4 before:content-['•'] before:mr-2 before:text-primary"
                >
                  {opportunity}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  );
}
