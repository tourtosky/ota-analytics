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

export default function CompetitorTable({ operatorData, competitors }: CompetitorTableProps) {
  const medianRating = calculateMedian(competitors.map((c) => c.rating));
  const medianReviewCount = calculateMedian(competitors.map((c) => c.reviewCount));
  const medianPrice = calculateMedian(competitors.map((c) => c.price));
  const medianPhotoCount = calculateMedian(competitors.map((c) => c.photoCount));

  const cellClass = (value: number, median: number) =>
    value < median ? "text-red-500 font-bold" : "text-slate-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 overflow-hidden shadow-sm">
      <h3 className="text-xl font-display font-bold text-slate-900 mb-6">Competitor Comparison</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-4 px-3 text-slate-400 font-medium uppercase text-xs tracking-wider">Tour</th>
              <th className="text-right py-4 px-3 text-slate-400 font-medium uppercase text-xs tracking-wider">Rating</th>
              <th className="text-right py-4 px-3 text-slate-400 font-medium uppercase text-xs tracking-wider">Reviews</th>
              <th className="text-right py-4 px-3 text-slate-400 font-medium uppercase text-xs tracking-wider">Price</th>
              <th className="text-right py-4 px-3 text-slate-400 font-medium uppercase text-xs tracking-wider">Photos</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            <motion.tr
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="border-b border-slate-100 bg-cyan-50/50"
            >
              <td className="py-4 px-3 text-slate-900 font-semibold max-w-xs truncate" title={operatorData.title}>{operatorData.title}</td>
              <td className={`text-right py-4 px-3 ${cellClass(operatorData.rating, medianRating)}`}>{operatorData.rating.toFixed(1)}</td>
              <td className={`text-right py-4 px-3 ${cellClass(operatorData.reviewCount, medianReviewCount)}`}>{operatorData.reviewCount}</td>
              <td className={`text-right py-4 px-3 ${cellClass(operatorData.price, medianPrice)}`}>{operatorData.currency}{operatorData.price.toFixed(0)}</td>
              <td className={`text-right py-4 px-3 ${cellClass(operatorData.photoCount, medianPhotoCount)}`}>{operatorData.photoCount}</td>
            </motion.tr>

            {competitors.slice(0, 5).map((c, i) => (
              <motion.tr
                key={c.productCode}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: (i + 1) * 0.1 }}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="py-4 px-3 text-slate-500 max-w-xs truncate" title={c.title}>{c.title}</td>
                <td className="text-right py-4 px-3 text-slate-600">{c.rating.toFixed(1)}</td>
                <td className="text-right py-4 px-3 text-slate-600">{c.reviewCount}</td>
                <td className="text-right py-4 px-3 text-slate-600">{c.currency}{c.price.toFixed(0)}</td>
                <td className="text-right py-4 px-3 text-slate-600">{c.photoCount}</td>
              </motion.tr>
            ))}

            <motion.tr
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              className="border-t-2 border-cyan-200 bg-cyan-50/30"
            >
              <td className="py-4 px-3 text-cyan-700 font-bold">MEDIAN</td>
              <td className="text-right py-4 px-3 text-cyan-700 font-bold">{medianRating.toFixed(1)}</td>
              <td className="text-right py-4 px-3 text-cyan-700 font-bold">{Math.round(medianReviewCount)}</td>
              <td className="text-right py-4 px-3 text-cyan-700 font-bold">{operatorData.currency}{Math.round(medianPrice)}</td>
              <td className="text-right py-4 px-3 text-cyan-700 font-bold">{Math.round(medianPhotoCount)}</td>
            </motion.tr>
          </tbody>
        </table>
      </div>

      <p className="text-slate-400 text-xs mt-4">
        <span className="text-red-500 font-semibold">Red values</span> indicate areas where you&apos;re below the market median
      </p>
    </div>
  );
}
