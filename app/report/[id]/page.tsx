"use client";

import { use, useEffect, useState } from "react";
import ScoreOverview from "@/components/ScoreOverview";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import CompetitorTable from "@/components/CompetitorTable";
import Recommendations from "@/components/Recommendations";
import ReviewInsights from "@/components/ReviewInsights";
import { Analysis } from "@/lib/db/schema";
import { Loader2, ExternalLink, ArrowLeft, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import RegisterModal from "@/components/RegisterModal";

/* ═══ Blurred lock overlay for premium sections ═══ */
function LockedSection({ title, children, onUnlock }: { title: string; children: React.ReactNode; onUnlock: () => void }) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Blurred placeholder content */}
      <div className="pointer-events-none select-none blur-[6px] opacity-60">
        {children}
      </div>
      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
        <div className="text-center px-6 py-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-50 to-violet-50 border border-slate-200 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-cyan-700" />
          </div>
          <h4 className="text-lg font-display font-bold text-slate-900 mb-2">{title}</h4>
          <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto">
            Upgrade to Pro to unlock AI-powered insights and actionable recommendations
          </p>
          <button onClick={onUnlock} className="inline-flex items-center gap-2 px-6 py-3 btn-gradient text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-700/20">
            <Sparkles className="w-4 h-4" />
            Unlock Full Report
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Fake placeholder data for blurred sections ═══ */
const fakeRecommendations = [
  { priority: "critical" as const, category: "title", title: "Optimize your listing title for search", description: "Your title is missing key search terms that top competitors use. Adding destination-specific keywords could improve visibility by 40%.", impact: "High — could increase click-through rate by 25-40%" },
  { priority: "high" as const, category: "photos", title: "Add more high-quality photos", description: "You have fewer photos than the competitor median. Listings with 12+ photos see significantly higher conversion rates.", impact: "Medium — expected 15-20% boost in bookings" },
  { priority: "medium" as const, category: "description", title: "Expand your description with highlights", description: "Your description is shorter than average. Adding sections about what's included, itinerary details, and traveler tips can improve engagement.", impact: "Medium — improved engagement and lower bounce rate" },
];

const fakeReviewInsights = {
  sentiment: "improving" as const,
  positives: [
    { theme: "Knowledgeable and friendly guide", frequency: 12 },
    { theme: "Well-organized itinerary", frequency: 8 },
    { theme: "Great value for money", frequency: 6 },
  ],
  negatives: [
    { theme: "Long wait times at meeting point", frequency: 4 },
    { theme: "Too rushed at key stops", frequency: 3 },
  ],
  keyPhrases: ["amazing experience", "highly recommend", "best tour", "exceeded expectations"],
  opportunities: ["Offer a private option for small groups", "Add a food stop to the itinerary"],
};

export default function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchAnalysis = async () => {
      try {
        const response = await fetch(`/api/report/${id}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Failed to fetch report");

        setAnalysis(data);

        if (data.status === "processing" || data.status === "pending") {
          intervalId = setTimeout(fetchAnalysis, 1500);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    };

    fetchAnalysis();
    return () => { if (intervalId) clearTimeout(intervalId); };
  }, [id]);

  // Progress data from the analysis
  const progress = (analysis as any)?.progress as { step: string; percent: number; message: string } | null;

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl text-red-500">!</span>
          </div>
          <h2 className="text-3xl font-display font-bold text-slate-900 mb-4">Error Loading Report</h2>
          <p className="text-slate-500 mb-8 max-w-md">{error}</p>
          <Link href="/" className="px-8 py-4 btn-gradient text-white font-semibold rounded-xl inline-flex items-center gap-2">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Loading state with real-time progress
  if (loading || !analysis || analysis.status === "processing" || analysis.status === "pending") {
    const percent = progress?.percent ?? 0;
    const message = progress?.message ?? "Starting analysis...";

    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center w-full max-w-md">
          <div className="w-20 h-20 rounded-2xl btn-gradient flex items-center justify-center mx-auto mb-8 shadow-lg shadow-cyan-700/20">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-3xl font-display font-bold text-slate-900 mb-4">Analyzing Your Listing</h2>

          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
            <motion.div
              className="h-full btn-gradient rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          {/* Current step message */}
          <motion.p
            key={message}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-slate-500 text-sm mb-2"
          >
            {message}
          </motion.p>
          <p className="text-slate-300 text-xs font-mono">{percent}%</p>
        </div>
      </div>
    );
  }

  // Failed state
  if (analysis.status === "failed") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl text-red-500">!</span>
          </div>
          <h2 className="text-3xl font-display font-bold text-slate-900 mb-4">Analysis Failed</h2>
          <p className="text-slate-500 mb-8 max-w-md">
            We couldn&apos;t complete the analysis. The product code may be invalid or the product is not available.
          </p>
          <Link href="/" className="px-8 py-4 btn-gradient text-white font-semibold rounded-xl inline-flex items-center gap-2">
            Try Another Listing
          </Link>
        </div>
      </div>
    );
  }

  const productData = analysis.productData as any;
  const competitorsData = analysis.competitorsData as any[];
  const recommendations = analysis.recommendations as any[];
  const reviewInsights = analysis.reviewInsights as any;
  const hasRecommendations = recommendations && recommendations.length > 0;
  const hasReviewInsights = !!reviewInsights;

  const viatorUrl = `https://www.viator.com/tours/${analysis.viatorProductCode}`;

  return (
    <main className="min-h-screen bg-slate-50">
      <RegisterModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        heading="Unlock AI Insights"
        subheading="Create a free account to access AI-powered recommendations and review analysis"
      />
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-lg font-bold tracking-tight text-slate-900">
              tour<span className="text-cyan-700">boost</span>
            </span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Analyze Another
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-3 tracking-tight">
            {analysis.productTitle}
          </h1>
          <a
            href={viatorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-cyan-700 hover:text-cyan-800 transition-colors text-sm font-medium"
          >
            View on Viator
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Score Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="grid lg:grid-cols-2 gap-6 mb-8">
          <ScoreOverview score={analysis.overallScore || 0} />
          <ScoreBreakdown scores={analysis.scores as any} />
        </motion.div>

        {/* Competitor Comparison */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mb-8">
          <CompetitorTable
            operatorData={{
              title: analysis.productTitle || "",
              rating: productData?.reviews?.combinedAverageRating || 0,
              reviewCount: productData?.reviews?.totalReviews || 0,
              price: productData?.pricing?.summary?.fromPrice || productData?.pricing?.price || 0,
              currency: productData?.pricing?.currency || "USD",
              photoCount: productData?.images?.length || 0,
            }}
            competitors={competitorsData || []}
          />
        </motion.div>

        {/* Recommendations — real or blurred */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="mb-8">
          {hasRecommendations ? (
            <Recommendations recommendations={recommendations} />
          ) : (
            <LockedSection title="AI-Powered Recommendations" onUnlock={() => setShowRegister(true)}>
              <Recommendations recommendations={fakeRecommendations} />
            </LockedSection>
          )}
        </motion.div>

        {/* Review Insights — real or blurred */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="mb-8">
          {hasReviewInsights ? (
            <ReviewInsights insights={reviewInsights} />
          ) : (
            <LockedSection title="Review Insights & Sentiment Analysis" onUnlock={() => setShowRegister(true)}>
              <ReviewInsights insights={fakeReviewInsights} />
            </LockedSection>
          )}
        </motion.div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm"
        >
          <h3 className="text-2xl font-display font-bold text-slate-900 mb-3">
            Ready to Optimize Another Listing?
          </h3>
          <p className="text-slate-500 mb-8">
            Paste any Viator URL and get your free analysis in seconds.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-8 py-4 btn-gradient text-white font-semibold rounded-xl shadow-lg shadow-cyan-700/20">
            Analyze Another Tour
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
