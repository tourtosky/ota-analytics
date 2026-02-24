"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

export default function AnalyzeForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const extractProductCode = (input: string): string | null => {
    // Viator URLs look like: https://www.viator.com/tours/City-Name/Tour-Title/d123-45678P9
    // Extract the product code (e.g., 45678P9)
    const urlMatch = input.match(/\/d\d+-(\d+P\d+)/);
    if (urlMatch) return urlMatch[1];

    // Check if it's already a product code (e.g., 45678P9)
    const codeMatch = input.match(/^(\d+P\d+)$/);
    if (codeMatch) return codeMatch[1];

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const productCode = extractProductCode(url.trim());
    if (!productCode) {
      setError("Please enter a valid Viator product URL or product code (e.g., 12345P6)");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start analysis");
      }

      // Redirect to report page
      router.push(`/report/${data.analysisId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste your Viator listing URL..."
          className="flex-1 px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-8 py-4 bg-primary hover:bg-primary-dark disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-primary/20"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              Analyze My Listing — Free
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-red-400 text-sm">{error}</p>
      )}
      <p className="mt-4 text-center text-gray-400 text-sm">
        Join 200+ tour operators who&apos;ve optimized their listings
      </p>
    </form>
  );
}
