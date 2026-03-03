"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScoreOverview from "@/components/ScoreOverview";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import CompetitorTable from "@/components/CompetitorTable";
import Recommendations from "@/components/Recommendations";
import ReviewInsights from "@/components/ReviewInsights";
import { Analysis } from "@/lib/db/schema";
import { Loader2, ExternalLink, Home } from "lucide-react";
import Link from "next/link";

export default function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchAnalysis = async () => {
      try {
        const response = await fetch(`/api/report/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch report");
        }

        setAnalysis(data);

        // If still processing, poll every 2 seconds
        if (data.status === "processing" || data.status === "pending") {
          intervalId = setTimeout(fetchAnalysis, 2000);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    };

    fetchAnalysis();

    return () => {
      if (intervalId) {
        clearTimeout(intervalId);
      }
    };
  }, [id]);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-red-400 mb-4">
            Error Loading Report
          </h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            href="/"
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all inline-flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Loading or processing state
  if (loading || !analysis || analysis.status === "processing" || analysis.status === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-6" />
          <h2 className="text-3xl font-display font-bold text-white mb-4">
            Analyzing Your Listing
          </h2>
          <div className="space-y-2 text-gray-400">
            <p>Fetching your listing data...</p>
            <p>Finding your top competitors...</p>
            <p>Analyzing reviews...</p>
            <p>Generating AI recommendations...</p>
          </div>
          <p className="mt-6 text-gray-500">This usually takes 20-30 seconds</p>
        </div>
      </div>
    );
  }

  // Failed state
  if (analysis.status === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-red-400 mb-4">
            Analysis Failed
          </h2>
          <p className="text-gray-400 mb-6">
            We couldn&apos;t complete the analysis. This might be because the
            product code is invalid or the product is not available.
          </p>
          <Link
            href="/"
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all inline-flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
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

  const viatorUrl = `https://www.viator.com/tours/${analysis.viatorProductCode}`;

  return (
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-primary transition-colors mb-6"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display font-bold text-white mb-2">
                {analysis.productTitle}
              </h1>
              <a
                href={viatorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
              >
                View on Viator
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Score Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <ScoreOverview score={analysis.overallScore || 0} />
          <ScoreBreakdown scores={analysis.scores as any} />
        </div>

        {/* Competitor Comparison */}
        <div className="mb-12">
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

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="mb-12">
            <Recommendations recommendations={recommendations} />
          </div>
        )}

        {/* Review Insights */}
        {reviewInsights && (
          <div className="mb-12">
            <ReviewInsights insights={reviewInsights} />
          </div>
        )}

        {/* Footer CTA */}
        <div className="glass rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-display font-bold text-white mb-4">
            Ready to Optimize Another Listing?
          </h3>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all shadow-lg shadow-primary/20"
          >
            Analyze Another Tour
          </Link>
        </div>
      </div>
    </main>
  );
}
