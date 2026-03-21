"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Search, X, ArrowRight, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UpgradeModal from "@/components/dashboard/UpgradeModal";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";

interface AnalysisItem {
  id: string;
  viatorProductCode: string;
  productTitle: string | null;
  status: string;
  overallScore: number | null;
  scores: {
    title: number;
    description: number;
    pricing: number;
    reviews: number;
    photos: number;
    completeness: number;
  } | null;
  createdAt: string;
  completedAt: string | null;
  progress: { step: string; percent: number; message: string } | null;
}

/* ─── Score badge ─── */
function ScoreBadge({ score, size = "md" }: { score: number | null; size?: "sm" | "md" }) {
  if (score === null) return null;
  const color = score >= 70 ? "text-emerald-600 bg-emerald-50 ring-emerald-200" : score >= 50 ? "text-amber-600 bg-amber-50 ring-amber-200" : "text-red-600 bg-red-50 ring-red-200";
  const s = size === "sm" ? "w-10 h-10 text-sm" : "w-12 h-12 text-lg";
  return (
    <div className={`${s} rounded-xl ${color} ring-1 font-mono font-bold flex items-center justify-center flex-shrink-0`}>
      {score}
    </div>
  );
}

/* ─── Status badge ─── */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-600 ring-emerald-200",
    processing: "bg-sky-50 text-sky-600 ring-sky-200",
    failed: "bg-red-50 text-red-600 ring-red-200",
    pending: "bg-slate-100 text-slate-500 ring-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ring-1 ${styles[status] || styles.pending}`}>
      {status === "processing" && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />}
      {status}
    </span>
  );
}

/* ─── Mini category bar ─── */
function CategoryBar({ label, score }: { label: string; score: number }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-400 w-16 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-mono text-slate-400 w-5 text-right">{score}</span>
    </div>
  );
}

/* ─── Time ago helper ─── */
function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ─── Analyze modal ─── */
function AnalyzeModal({ open, onClose, onPlanLimit }: { open: boolean; onClose: () => void; onPlanLimit: () => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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
    if (!productCode) { setError("Please enter a valid listing URL or product code"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productCode }),
      });
      const data = await res.json();
      if (res.status === 403 && data.error === "plan_limit_reached") {
        onClose();
        onPlanLimit();
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to start analysis");
      router.push(`/dashboard/listings/${data.analysisId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) { setUrl(""); setError(""); setLoading(false); }
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl shadow-slate-900/10 overflow-hidden"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="px-8 pt-8 pb-2">
              <h2 className="text-xl font-display font-bold text-slate-900">Analyze a Listing</h2>
              <p className="text-sm text-slate-500 mt-1">Enter your listing URL or product code to start</p>
            </div>
            <form onSubmit={handleSubmit} className="px-8 pb-8 pt-4 space-y-4">
              <div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.viator.com/tours/... or 12345P6"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all text-sm"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="w-full py-3 btn-gradient text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-700/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Search className="w-4 h-4" /> Start Analysis</>}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [userPlan, setUserPlan] = useState<Plan>("free");
  const router = useRouter();

  // Fetch user plan
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => { if (data.plan) setUserPlan(data.plan); });
  }, []);

  const fetchAnalyses = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/analyses");
      if (!res.ok) return;
      const data = await res.json();
      setAnalyses(data.analyses || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  // Poll if any analysis is processing/pending
  useEffect(() => {
    const hasActive = analyses.some((a) => a.status === "processing" || a.status === "pending");
    if (!hasActive) return;
    const timer = setInterval(fetchAnalyses, 3000);
    return () => clearInterval(timer);
  }, [analyses, fetchAnalyses]);

  // Stats
  const completed = analyses.filter((a) => a.status === "completed");
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((sum, a) => sum + (a.overallScore || 0), 0) / completed.length)
    : null;
  const needsWork = completed.filter((a) => (a.overallScore || 0) < 60).length;

  const scoreAccent = (s: number | null) => {
    if (s === null) return "text-slate-400";
    if (s >= 70) return "text-emerald-600";
    if (s >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const isAtLimit = analyses.length >= PLAN_LIMITS[userPlan];

  const handleNewListing = () => {
    if (isAtLimit) {
      setShowUpgrade(true);
    } else {
      setShowModal(true);
    }
  };

  return (
    <div>
      <AnalyzeModal open={showModal} onClose={() => setShowModal(false)} onPlanLimit={() => setShowUpgrade(true)} />
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} plan={userPlan} />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">My Listings</h1>
          <p className="text-sm text-slate-400 mt-1">{analyses.length > 0 ? `${analyses.length} listing${analyses.length === 1 ? "" : "s"} tracked` : "Track and optimize your tour listings"}</p>
        </div>
        <button
          onClick={handleNewListing}
          className="inline-flex items-center gap-2 px-5 py-2.5 btn-gradient text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-700/20"
        >
          <Plus className="w-4 h-4" />
          Analyze New Listing
        </button>
      </div>

      {/* Stats */}
      {analyses.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Listings", value: analyses.length, color: "text-slate-900" },
            { label: "Avg Score", value: avgScore !== null ? avgScore : "\u2014", color: scoreAccent(avgScore) },
            { label: "Completed", value: completed.length, color: "text-emerald-600" },
            { label: "Needs Work", value: needsWork, color: needsWork > 0 ? "text-red-600" : "text-slate-400" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{stat.label}</p>
              <p className={`text-2xl font-mono font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-6 h-6 text-cyan-700 animate-spin" />
        </div>
      ) : analyses.length === 0 ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24"
        >
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-xl font-display font-bold text-slate-900 mb-2">No listings analyzed yet</h3>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">Add your listing URL to get your first optimization report</p>
          <button
            onClick={handleNewListing}
            className="inline-flex items-center gap-2 px-6 py-3 btn-gradient text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-700/20"
          >
            <Plus className="w-4 h-4" />
            Analyze your first listing
          </button>
        </motion.div>
      ) : (
        /* Listing cards */
        <div className="space-y-3">
          {analyses.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => router.push(`/dashboard/listings/${item.id}`)}
              className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group"
            >
              <div className="flex items-start gap-4">
                {/* Score or spinner */}
                {item.status === "processing" || item.status === "pending" ? (
                  <div className="w-12 h-12 rounded-xl bg-sky-50 ring-1 ring-sky-200 flex items-center justify-center flex-shrink-0">
                    <div className="relative">
                      <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
                      {item.progress && (
                        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-sky-600 whitespace-nowrap">
                          {item.progress.percent}%
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <ScoreBadge score={item.overallScore} />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-cyan-700 transition-colors">
                        {item.productTitle || item.viatorProductCode}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{item.viatorProductCode}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-slate-400 hidden sm:block">{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* Progress bar for processing */}
                  {(item.status === "processing" || item.status === "pending") && item.progress && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-sky-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress.percent}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">{item.progress.message}</p>
                    </div>
                  )}

                  {/* Score bars for completed */}
                  {item.status === "completed" && item.scores && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5 mt-3">
                      <CategoryBar label="Title" score={item.scores.title} />
                      <CategoryBar label="Description" score={item.scores.description} />
                      <CategoryBar label="Pricing" score={item.scores.pricing} />
                      <CategoryBar label="Reviews" score={item.scores.reviews} />
                      <CategoryBar label="Photos" score={item.scores.photos} />
                      <CategoryBar label="Complete" score={item.scores.completeness} />
                    </div>
                  )}

                  {/* Failed */}
                  {item.status === "failed" && (
                    <p className="text-xs text-red-500 mt-2">Analysis failed. Try again.</p>
                  )}
                </div>

                {/* Arrow */}
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-cyan-700 transition-colors flex-shrink-0 mt-1 hidden sm:block" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
