"use client";

import { CompetitorData } from "@/lib/viator/types";
import { motion } from "framer-motion";
import { calculateMedian } from "@/lib/viator/products";

interface CompetitorTableProps {
  operatorData: {
    title: string;
    rating: number;
    reviewCount: number;
    price: number;
    currency: string;
    photoCount: number;
  };
  competitors: CompetitorData[];
}

export default function CompetitorTable({
  operatorData,
  competitors,
}: CompetitorTableProps) {
  // Calculate medians
  const medianRating = calculateMedian(competitors.map((c) => c.rating));
  const medianReviewCount = calculateMedian(
    competitors.map((c) => c.reviewCount)
  );
  const medianPrice = calculateMedian(competitors.map((c) => c.price));
  const medianPhotoCount = calculateMedian(
    competitors.map((c) => c.photoCount)
  );

  const isBelowMedian = (value: number, median: number) => value < median;

  const cellClass = (value: number, median: number) => {
    return isBelowMedian(value, median)
      ? "text-red-400 font-bold"
      : "text-gray-300";
  };

  return (
    <div className="glass rounded-2xl p-8 overflow-hidden">
      <h3 className="text-2xl font-display font-bold text-white mb-6">
        Competitor Comparison
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-4 px-3 text-gray-400 font-semibold">
                Tour
              </th>
              <th className="text-right py-4 px-3 text-gray-400 font-semibold">
                Rating
              </th>
              <th className="text-right py-4 px-3 text-gray-400 font-semibold">
                Reviews
              </th>
              <th className="text-right py-4 px-3 text-gray-400 font-semibold">
                Price
              </th>
              <th className="text-right py-4 px-3 text-gray-400 font-semibold">
                Photos
              </th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {/* Operator Row */}
            <motion.tr
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="border-b border-white/10 bg-primary/10"
            >
              <td className="py-4 px-3 text-white font-semibold max-w-xs truncate" title={operatorData.title}>
                {operatorData.title}
              </td>
              <td
                className={`text-right py-4 px-3 ${cellClass(
                  operatorData.rating,
                  medianRating
                )}`}
              >
                {operatorData.rating.toFixed(1)}
              </td>
              <td
                className={`text-right py-4 px-3 ${cellClass(
                  operatorData.reviewCount,
                  medianReviewCount
                )}`}
              >
                {operatorData.reviewCount}
              </td>
              <td
                className={`text-right py-4 px-3 ${cellClass(
                  operatorData.price,
                  medianPrice
                )}`}
              >
                {operatorData.currency}
                {operatorData.price.toFixed(0)}
              </td>
              <td
                className={`text-right py-4 px-3 ${cellClass(
                  operatorData.photoCount,
                  medianPhotoCount
                )}`}
              >
                {operatorData.photoCount}
              </td>
            </motion.tr>

            {/* Competitor Rows */}
            {competitors.slice(0, 5).map((competitor, index) => (
              <motion.tr
                key={competitor.productCode}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: (index + 1) * 0.1 }}
                className="border-b border-white/10 hover:bg-white/5"
              >
                <td className="py-4 px-3 text-gray-300 max-w-xs truncate" title={competitor.title}>
                  {competitor.title}
                </td>
                <td className="text-right py-4 px-3 text-gray-300">
                  {competitor.rating.toFixed(1)}
                </td>
                <td className="text-right py-4 px-3 text-gray-300">
                  {competitor.reviewCount}
                </td>
                <td className="text-right py-4 px-3 text-gray-300">
                  {competitor.currency}
                  {competitor.price.toFixed(0)}
                </td>
                <td className="text-right py-4 px-3 text-gray-300">
                  {competitor.photoCount}
                </td>
              </motion.tr>
            ))}

            {/* Median Row */}
            <motion.tr
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              className="border-t-2 border-primary/30 bg-white/5"
            >
              <td className="py-4 px-3 text-primary font-bold">MEDIAN</td>
              <td className="text-right py-4 px-3 text-primary font-bold">
                {medianRating.toFixed(1)}
              </td>
              <td className="text-right py-4 px-3 text-primary font-bold">
                {Math.round(medianReviewCount)}
              </td>
              <td className="text-right py-4 px-3 text-primary font-bold">
                {operatorData.currency}
                {Math.round(medianPrice)}
              </td>
              <td className="text-right py-4 px-3 text-primary font-bold">
                {Math.round(medianPhotoCount)}
              </td>
            </motion.tr>
          </tbody>
        </table>
      </div>

      <p className="text-gray-400 text-xs mt-4">
        <span className="text-red-400 font-semibold">Red values</span> indicate
        areas where you&apos;re below the market median
      </p>
    </div>
  );
}
