"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScoreOverview from "@/components/ScoreOverview";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import CompetitorTable from "@/components/CompetitorTable";
import ListingsOverview from "@/components/ListingsOverview";
import Recommendations from "@/components/Recommendations";
import ReviewInsights from "@/components/ReviewInsights";
import { Analysis } from "@/lib/db/schema";
import { Loader2, ArrowLeft, ExternalLink, Share2, Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Get current user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setCurrentUserId(data.id);
      });
  }, []);

  // Fetch analysis with polling
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const fetchAnalysis = async () => {
      try {
        const response = await fetch(`/api/report/${id}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Failed to fetch report");

        // Ownership check
        if (currentUserId && data.userId && data.userId !== currentUserId) {
          router.push("/dashboard");
          return;
        }

        setAnalysis(data);

        if (data.status === "processing" || data.status === "pending") {
          timeoutId = setTimeout(fetchAnalysis, 2000);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    };

    fetchAnalysis();
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [id, currentUserId, router]);

  const progress = (analysis as any)?.progress as { step: string; percent: number; message: string } | null;

  const handleShare = async () => {
    const url = `${window.location.origin}/report/${id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete this listing report? This cannot be undone."
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/analyses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      router.push("/dashboard");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  };

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl text-red-500">!</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-3">Error Loading Report</h2>
          <p className="text-slate-500 mb-6 max-w-md">{error}</p>
          <Link href="/dashboard" className="px-6 py-3 btn-gradient text-white font-semibold rounded-xl text-sm inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Loading / processing state
  if (loading || !analysis || analysis.status === "processing" || analysis.status === "pending") {
    const percent = progress?.percent ?? 0;
    const message = progress?.message ?? "Starting analysis...";

    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center w-full max-w-md">
          <div className="w-16 h-16 rounded-2xl btn-gradient flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-700/20">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-4">Analyzing Your Listing</h2>

          <div className="w-full h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
            <motion.div
              className="h-full btn-gradient rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

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
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl text-red-500">!</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-3">Analysis Failed</h2>
          <p className="text-slate-500 mb-6 max-w-md">
            We couldn&apos;t complete the analysis. The product code may be invalid or the product is not available.
          </p>
          <Link href="/dashboard" className="px-6 py-3 btn-gradient text-white font-semibold rounded-xl text-sm inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const productData = analysis.productData as any;
  const competitorsData = analysis.competitorsData as any[];

  // Build a working Viator product URL. Viator's router is slug-lenient —
  // only d{destId}-{productCode} at the end needs to be correct.
  const destRef = productData?.destinations?.[0]?.ref;
  const titleSlug = (analysis.productTitle || "tour")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "tour";
  const viatorUrl = destRef
    ? `https://www.viator.com/tours/x/${titleSlug}/d${destRef}-${analysis.viatorProductCode}`
    : `https://www.viator.com/search/${encodeURIComponent(analysis.viatorProductCode)}`;
  const recommendations = analysis.recommendations as any[];
  const reviewInsights = analysis.reviewInsights as any;
  const hasRecommendations = recommendations && recommendations.length > 0;
  const hasReviewInsights = !!reviewInsights;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="min-w-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-900 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            My Listings
          </Link>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900 tracking-tight truncate">
            {analysis.productTitle || analysis.viatorProductCode}
          </h1>
          <a
            href={viatorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-cyan-700 hover:text-cyan-800 transition-colors text-sm font-medium mt-1"
          >
            View on Viator <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            {copied ? <><Check className="w-4 h-4 text-emerald-500" /> Copied!</> : <><Share2 className="w-4 h-4" /> Share Report</>}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-white text-sm font-medium text-red-600 hover:border-red-300 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete this listing"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>

      {/* Score Section */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <ScoreOverview score={analysis.overallScore || 0} />
        <ScoreBreakdown scores={analysis.scores as any} />
      </div>

      {/* Competitor Comparison */}
      <div className="mb-8">
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
      </div>

      {/* Listings Overview — public Viator category pages this product appears on */}
      {analysis.listings && analysis.listings.length > 0 && (
        <div className="mb-8">
          <ListingsOverview listings={analysis.listings} />
        </div>
      )}

      {/* Recommendations */}
      {hasRecommendations && (
        <div className="mb-8">
          <Recommendations recommendations={recommendations} />
        </div>
      )}

      {/* Review Insights */}
      {hasReviewInsights && (
        <div className="mb-8">
          <ReviewInsights insights={reviewInsights} />
        </div>
      )}
    </div>
  );
}
