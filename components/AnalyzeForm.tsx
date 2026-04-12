"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import RegisterModal from "@/components/RegisterModal";

export default function AnalyzeForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setIsAuthenticated(true);
      })
      .catch(() => {});
  }, []);

  const extractProductCode = (input: string): string | null => {
    const urlMatch = input.match(/\/d\d+-([A-Za-z0-9]+)/);
    if (urlMatch) return urlMatch[1];
    const codeMatch = input.match(/^([A-Za-z0-9]{4,})$/);
    if (codeMatch) return codeMatch[1];
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const productCode = extractProductCode(url.trim());
    if (!productCode) {
      setError("Please enter a valid listing URL or product code");
      return;
    }

    setLoading(true);

    const hasUsedFree = typeof window !== "undefined" && localStorage.getItem("peregrio_anon_used") === "1";

    if (hasUsedFree && !isAuthenticated) {
      setPendingCode(productCode);
      setShowRegister(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productCode, sourceUrl: url.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error === "plan_limit_reached") {
          setError("__plan_limit__");
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Failed to start analysis");
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("peregrio_anon_used", "1");
      }
      router.push(`/report/${data.analysisId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const handleAnalyzeAfterRegister = async () => {
    if (!pendingCode) {
      setShowRegister(false);
      return;
    }
    setShowRegister(false);
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productCode: pendingCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start analysis");
      if (typeof window !== "undefined") {
        localStorage.removeItem("peregrio_anon_used");
      }
      router.push(`/report/${data.analysisId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <>
    <RegisterModal
      open={showRegister}
      onClose={() => setShowRegister(false)}
      heading="You've used your free analysis"
      subheading="Sign up free to get 1 more analysis and track your listing over time."
      onSuccess={handleAnalyzeAfterRegister}
    />
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className={`relative rounded-2xl p-[2px] transition-all duration-500 ${
        focused
          ? "bg-gradient-to-r from-cyan-600 via-violet-600 to-cyan-600 shadow-[0_0_30px_rgba(8,145,178,0.2)]"
          : "bg-slate-200"
      }`}>
        <div className="flex flex-col sm:flex-row gap-2 rounded-[14px] p-2 bg-white">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Paste your listing URL..."
            className="flex-1 px-5 py-4 rounded-xl text-base bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-8 py-4 btn-gradient disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 whitespace-nowrap text-base shadow-lg shadow-cyan-700/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyze Free
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
      {error && (
        error === "__plan_limit__" ? (
          <p className="text-sm text-center text-slate-500 mt-3">
            You&apos;ve reached your free limit.{" "}
            <a href="/dashboard" className="text-cyan-700 font-medium hover:underline">
              Go to Dashboard →
            </a>
          </p>
        ) : (
          <p className="text-sm text-red-500 mt-3 text-center">{error}</p>
        )
      )}
      <p className="mt-4 text-center text-xs text-slate-400">
        No signup required. Get your score in 30 seconds.
      </p>
    </form>
    </>
  );
}
