"use client";

import { DiscoveredListing } from "@/lib/viator/types";
import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink, HelpCircle, Lock } from "lucide-react";

interface ListingsOverviewProps {
  listings: DiscoveredListing[];
}

export default function ListingsOverview({ listings }: ListingsOverviewProps) {
  if (!listings || listings.length === 0) {
    return null;
  }

  const verifiedCount = listings.filter((l) => l.verified).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 overflow-hidden shadow-sm">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h3 className="text-xl font-display font-bold text-slate-900 mb-1">
            Listings Your Tour Appears On
          </h3>
          <p className="text-sm text-slate-500">
            {verifiedCount} of {listings.length} category pages confirmed via Viator API
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-4 px-3 text-slate-400 font-medium uppercase text-xs tracking-wider">
                Destination
              </th>
              <th className="text-left py-4 px-3 text-slate-400 font-medium uppercase text-xs tracking-wider">
                Category
              </th>
              <th className="text-center py-4 px-3 text-slate-400 font-medium uppercase text-xs tracking-wider">
                Status
              </th>
              <th className="text-right py-4 px-3 text-slate-400 font-medium uppercase text-xs tracking-wider">
                Total in listing
              </th>
              <th className="text-center py-4 px-3 text-slate-400 font-medium uppercase text-xs tracking-wider">
                Link
              </th>
              <th className="text-right py-4 px-3 text-slate-400 font-medium uppercase text-xs tracking-wider">
                Track
              </th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing, i) => (
              <motion.tr
                key={`${listing.destinationId}-${listing.tagId}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.6) }}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="py-4 px-3 text-slate-900 font-medium">
                  {listing.destinationName}
                </td>
                <td className="py-4 px-3 text-slate-600">{listing.tagName}</td>
                <td className="py-4 px-3 text-center">
                  {listing.verified ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold"
                      title="Your product was confirmed in this category"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold"
                      title="Product not found in the first 50 results — may be lower-ranked or filtered out"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Unverified
                    </span>
                  )}
                </td>
                <td className="text-right py-4 px-3 text-slate-600 font-mono">
                  {typeof listing.totalInListing === "number"
                    ? listing.totalInListing.toLocaleString()
                    : "—"}
                </td>
                <td className="py-4 px-3 text-center">
                  <a
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-cyan-700 hover:bg-cyan-50 transition-colors"
                    title="Open listing on Viator"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </td>
                <td className="text-right py-4 px-3">
                  <button
                    type="button"
                    disabled
                    title="Coming soon — Stage 2"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-xs font-semibold cursor-not-allowed"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Track
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-slate-400 text-xs mt-4">
        Each link opens the public Viator category page. Rank tracking for these
        listings is coming soon.
      </p>
    </div>
  );
}
