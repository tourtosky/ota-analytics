"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Plus,
  BarChart3,
  Target,
  MessageSquare,
  Star,
  LogOut,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

/* ═══ Mock data ═══ */
const mockListings = [
  {
    id: "1",
    title: "Private Rome Colosseum Underground Tour",
    productCode: "P12345",
    score: 72,
    prevScore: 58,
    status: "completed" as const,
    lastAnalyzed: "2 days ago",
    scores: { title: 85, description: 68, pricing: 92, reviews: 45, photos: 62, completeness: 78 },
    topRecommendation: "Add 5 more photos — you're at 7, median is 12",
  },
  {
    id: "2",
    title: "Skip-the-Line Vatican Museums & Sistine Chapel",
    productCode: "P67890",
    score: 43,
    prevScore: 43,
    status: "completed" as const,
    lastAnalyzed: "1 week ago",
    scores: { title: 35, description: 52, pricing: 78, reviews: 28, photos: 15, completeness: 48 },
    topRecommendation: "Rewrite title to include 'small group' — 8 of 10 competitors use it",
  },
  {
    id: "3",
    title: "Amalfi Coast Day Trip from Naples",
    productCode: "P11223",
    score: 88,
    prevScore: 71,
    status: "completed" as const,
    lastAnalyzed: "5 days ago",
    scores: { title: 92, description: 85, pricing: 88, reviews: 90, photos: 82, completeness: 95 },
    topRecommendation: "Your listing is performing well — consider A/B testing a lower price point",
  },
  {
    id: "4",
    title: "Florence Food Tour with Wine Tasting",
    productCode: "P44556",
    score: null,
    prevScore: null,
    status: "processing" as const,
    lastAnalyzed: "Just now",
    scores: null,
    topRecommendation: null,
  },
];

const mockActivity = [
  { action: "Analysis completed", listing: "Private Rome Colosseum Underground Tour", time: "2 days ago", type: "success" as const },
  { action: "Score improved +14", listing: "Amalfi Coast Day Trip from Naples", time: "5 days ago", type: "improvement" as const },
  { action: "Analysis completed", listing: "Skip-the-Line Vatican Museums", time: "1 week ago", type: "success" as const },
  { action: "New listing added", listing: "Florence Food Tour with Wine Tasting", time: "Just now", type: "new" as const },
];

/* ═══ Score badge ═══ */
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-slate-400 font-mono">---</span>;
  const color = score >= 80 ? "text-emerald-600 bg-emerald-50" : score >= 60 ? "text-amber-600 bg-amber-50" : "text-red-500 bg-red-50";
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-lg font-mono font-bold text-lg ${color}`}>{score}</span>;
}

/* ═══ Score change indicator ═══ */
function ScoreChange({ current, prev }: { current: number | null; prev: number | null }) {
  if (current === null || prev === null) return null;
  const diff = current - prev;
  if (diff === 0) return <span className="text-xs text-slate-400">No change</span>;
  if (diff > 0) return <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />+{diff}</span>;
  return <span className="text-xs text-red-500 font-semibold flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />{diff}</span>;
}

/* ═══ Mini score bar ═══ */
function MiniBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-slate-400 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className="font-mono font-bold text-slate-600 w-6 text-right">{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ email: string; fullName: string | null } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          router.push("/login");
          return;
        }
        // If admin, redirect to admin dashboard
        if (data.role === "admin") {
          router.push("/admin");
          return;
        }
        setUser({ email: data.email, fullName: data.fullName });
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const avgScore = Math.round(
    mockListings.filter((l) => l.score !== null).reduce((sum, l) => sum + (l.score || 0), 0) /
    mockListings.filter((l) => l.score !== null).length
  );

  const completedCount = mockListings.filter((l) => l.status === "completed").length;
  const needsWorkCount = mockListings.filter((l) => l.score !== null && l.score < 60).length;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
              tour<span className="text-cyan-700">boost</span>
            </Link>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider hidden sm:block">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:block">{user.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-900">
              Welcome back{user.fullName ? `, ${user.fullName}` : ""}
            </h1>
            <p className="text-slate-500 text-sm mt-1">Here&apos;s how your listings are performing</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 btn-gradient text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-700/20"
          >
            <Plus className="w-4 h-4" />
            Analyze New Listing
          </Link>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Average Score", value: avgScore.toString(), icon: Target, color: avgScore >= 60 ? "text-emerald-600" : "text-amber-600" },
            { label: "Listings Tracked", value: mockListings.length.toString(), icon: BarChart3, color: "text-cyan-700" },
            { label: "Completed Analyses", value: completedCount.toString(), icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Needs Attention", value: needsWorkCount.toString(), icon: AlertCircle, color: needsWorkCount > 0 ? "text-red-500" : "text-slate-400" },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <span className={`text-3xl font-mono font-bold ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          {/* Listings */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Your Listings</h2>
              <span className="text-xs text-slate-400">{mockListings.length} listings</span>
            </div>

            <div className="space-y-3">
              {mockListings.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-slate-900 font-semibold truncate">{listing.title}</h3>
                        {listing.status === "processing" && (
                          <span className="flex items-center gap-1 text-xs text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full flex-shrink-0">
                            <Clock className="w-3 h-3 animate-spin" />
                            Processing
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="font-mono">{listing.productCode}</span>
                        <span>Analyzed {listing.lastAnalyzed}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <ScoreChange current={listing.score} prev={listing.prevScore} />
                      <ScoreBadge score={listing.score} />
                    </div>
                  </div>

                  {listing.scores && (
                    <div className="space-y-2 mb-4">
                      <MiniBar label="Title" value={listing.scores.title} />
                      <MiniBar label="Description" value={listing.scores.description} />
                      <MiniBar label="Pricing" value={listing.scores.pricing} />
                      <MiniBar label="Reviews" value={listing.scores.reviews} />
                      <MiniBar label="Photos" value={listing.scores.photos} />
                      <MiniBar label="Completeness" value={listing.scores.completeness} />
                    </div>
                  )}

                  {listing.topRecommendation && (
                    <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 mb-3">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600">{listing.topRecommendation}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <Link
                      href={`/report/${listing.id}`}
                      className="text-xs text-cyan-700 hover:text-cyan-800 font-medium flex items-center gap-1"
                    >
                      View Full Report
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                    <a
                      href={`https://www.viator.com/tours/${listing.productCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                    >
                      Viator <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {mockActivity.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
                      item.type === "success" ? "bg-emerald-500" :
                      item.type === "improvement" ? "bg-cyan-500" :
                      "bg-violet-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 font-medium">{item.action}</p>
                      <p className="text-xs text-slate-400 truncate">{item.listing}</p>
                      <p className="text-xs text-slate-300 mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-gradient-to-br from-cyan-50 to-violet-50 rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-3">Quick Tips</h3>
              <div className="space-y-3">
                {[
                  "Re-analyze listings monthly to track score changes",
                  "Focus on your lowest-scoring dimension first",
                  "Check competitor reviews for quick-win ideas",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Legend */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-3">Score Guide</h3>
              <div className="space-y-2">
                {[
                  { range: "80-100", label: "Excellent", color: "bg-emerald-500" },
                  { range: "60-79", label: "Good", color: "bg-amber-500" },
                  { range: "40-59", label: "Needs Work", color: "bg-orange-500" },
                  { range: "0-39", label: "Critical", color: "bg-red-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="font-mono text-slate-500 w-14">{item.range}</span>
                    <span className="text-slate-600">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
