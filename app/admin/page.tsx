"use client";

import { useState, useEffect, useCallback, Fragment, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import "./theme.css";

// ─── Types ───────────────────────────────────────────────────

interface Stats {
  totalAnalyses: number;
  completedCount: number;
  failedCount: number;
  successRate: number;
  avgScore: number;
  todayCount: number;
  scrapeSuccessRate: number;
  cacheEntries: number;
  avgProcessingTime?: number;
  scoreDistribution?: number[];
}

interface AnalysisItem {
  id: string;
  viatorProductCode: string;
  productTitle: string | null;
  status: string;
  overallScore: number | null;
  dataSource: string | null;
  competitorCount: number;
  createdAt: string;
  completedAt: string | null;
}

interface AnalysisDetail {
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
  productData: Record<string, unknown> | null;
  competitorsData: Record<string, unknown>[] | null;
  recommendations: { priority: string; category: string; title: string; description: string; impact: string }[] | null;
  reviewInsights: { positives?: string[]; negatives?: string[]; sentiment?: string; keyPhrases?: string[]; opportunities?: string[] } | null;
  dataSource: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface ScrapingEvents {
  totalAttempts: number;
  successCount: number;
  blockedCount: number;
  cacheHitCount: number;
  recentEvents: { id: number; event: string; metadata: Record<string, unknown>; createdAt: string }[];
}

interface ApiEvents {
  viatorCallsToday: number;
  viatorCallsTotal: number;
  anthropicCallsToday: number;
  anthropicCallsTotal: number;
  recentEvents: { id: number; event: string; metadata: Record<string, unknown>; createdAt: string }[];
}

interface DashboardData {
  stats: Stats;
  analyses: {
    items: AnalysisItem[];
    total: number;
    page: number;
    pageSize: number;
  };
  events: {
    scraping: ScrapingEvents;
    api: ApiEvents;
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function scoreColor(score: number | null): string {
  if (score === null) return "adm-text-muted";
  if (score >= 70) return "text-emerald-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-slate-500/10 adm-text-muted";
  if (score >= 70) return "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20";
  if (score >= 40) return "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20";
  return "bg-red-500/10 text-red-600 ring-1 ring-red-500/20";
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20",
    failed: "bg-red-500/10 text-red-600 ring-1 ring-red-500/20",
    processing: "bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20",
    pending: "bg-slate-500/10 adm-text-muted ring-1 ring-slate-500/20",
  };
  return map[status] || "bg-slate-500/10 adm-text-muted";
}

function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    high: "bg-red-500/10 text-red-600 ring-1 ring-red-500/20",
    medium: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20",
    low: "bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20",
  };
  return map[priority] || "bg-slate-500/10 adm-text-muted";
}

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("admin-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("admin-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}

// ─── Component ───────────────────────────────────────────────

export default function AdminPage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"analyses" | "scraping" | "api">("analyses");

  // Filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dataSourceFilter, setDataSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [timeRange, setTimeRange] = useState("all");

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AnalysisDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10);
  const [countdown, setCountdown] = useState(10);
  const countdownRef = useRef(10);

  // Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Auth
  const router = useRouter();
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        status: statusFilter,
        dataSource: dataSourceFilter,
        timeRange,
      });
      if (searchDebounced) params.set("search", searchDebounced);

      const res = await fetch(`/api/admin/stats?${params}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, dataSourceFilter, searchDebounced, timeRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    countdownRef.current = refreshInterval;
    setCountdown(refreshInterval);
    const timer = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) {
        countdownRef.current = refreshInterval;
        setCountdown(refreshInterval);
        fetchData();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, fetchData]);

  const fetchDetail = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); setDetail(null); return; }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/analysis/${id}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      setDetail(await res.json());
    } catch { setDetail(null); } finally { setDetailLoading(false); }
  };

  const deleteAnalysis = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this analysis?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/analysis/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      if (expandedId === id) { setExpandedId(null); setDetail(null); }
      fetchData();
    } catch (err) { alert(err instanceof Error ? err.message : "Delete failed"); }
    finally { setActionLoading(null); }
  };

  const rerunAnalysis = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/analysis/${id}/rerun`, { method: "POST" });
      if (!res.ok) throw new Error("Re-run failed");
      const { productCode } = await res.json();
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productCode }),
      });
      if (!analyzeRes.ok) throw new Error("Analysis start failed");
      fetchData();
    } catch (err) { alert(err instanceof Error ? err.message : "Re-run failed"); }
    finally { setActionLoading(null); }
  };

  const totalPages = data ? Math.ceil(data.analyses.total / data.analyses.pageSize) : 0;

  return (
    <div className={`admin-theme ${theme === "light" ? "light" : ""} min-h-screen p-4 md:p-6 lg:p-8`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold adm-text-primary tracking-tight">
              Tour<span className="text-sky-500">Boost</span>{" "}
              <span className="adm-text-muted font-normal">Admin</span>
            </h1>
            <p className="text-xs adm-text-muted mt-0.5">System Dashboard</p>
          </div>
          <span className="text-[10px] bg-sky-500/10 text-sky-500 px-2 py-0.5 rounded-full font-mono ring-1 ring-sky-500/20">
            {process.env.NODE_ENV === "production" ? "PROD" : "DEV"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <button onClick={toggleTheme} className="adm-btn px-2.5 py-1.5 rounded-md transition-colors" title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              {theme === "dark" ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <button onClick={() => { setLoading(true); fetchData(); }} className="adm-btn px-2.5 py-1.5 rounded-md transition-colors" title="Refresh now">Refresh</button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2.5 py-1.5 rounded-md transition-colors ring-1 ${autoRefresh ? "bg-sky-500/10 text-sky-500 ring-sky-500/20" : "adm-btn"}`}
            >
              {autoRefresh ? `Auto ${countdown}s` : "Auto off"}
            </button>
            {autoRefresh && (
              <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} className="adm-input adm-select rounded-md px-1.5 py-1.5 text-xs">
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
            )}
          </div>
          <button onClick={handleLogout} className="adm-btn px-2.5 py-1.5 text-xs rounded-md hover:!text-red-500 transition-colors">Logout</button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-500">{error}</span>
          <button onClick={() => { setError(null); setLoading(true); fetchData(); }} className="text-xs text-red-400 font-medium hover:underline">Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {loading && !data ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="adm-card rounded-xl p-4 animate-pulse">
              <div className="h-3 adm-skeleton rounded w-20 mb-3" />
              <div className="h-8 adm-skeleton rounded w-16 mb-2" />
              <div className="h-2 adm-skeleton rounded w-24" />
            </div>
          ))
        ) : data ? (
          <>
            <StatCard label="Total Analyses" value={data.stats.totalAnalyses} accent="sky" sub={`+${data.stats.todayCount} today`} />
            <StatCard label="Success Rate" value={`${data.stats.successRate}%`} accent={data.stats.successRate >= 80 ? "emerald" : data.stats.successRate >= 50 ? "amber" : "red"} sub={`${data.stats.completedCount} / ${data.stats.totalAnalyses}`} />
            <StatCard label="Avg Score" value={data.stats.avgScore} accent={data.stats.avgScore >= 70 ? "emerald" : data.stats.avgScore >= 40 ? "amber" : "red"} sub="across completed" />
            <StatCard label="Scrape Rate" value={`${data.stats.scrapeSuccessRate}%`} accent={data.stats.scrapeSuccessRate > 50 ? "emerald" : "red"} sub={data.stats.scrapeSuccessRate === 0 ? "no scrapes yet" : "ZenRows success"} />
            <StatCard label="Cache Entries" value={data.stats.cacheEntries} accent="violet" sub="scraped pages" />
            <StatCard label="Avg Time" value={data.stats.avgProcessingTime ? formatDuration(data.stats.avgProcessingTime) : "\u2014"} accent="slate" sub="per analysis" />
          </>
        ) : null}
      </div>

      {/* Score Distribution */}
      {data?.stats.scoreDistribution && data.stats.scoreDistribution.some(v => v > 0) && (
        <div className="adm-card rounded-xl p-4 mb-6">
          <h3 className="text-xs uppercase tracking-wider adm-text-muted font-medium mb-3">Score Distribution</h3>
          <ScoreDistributionChart distribution={data.stats.scoreDistribution} />
        </div>
      )}

      {/* Tabbed Panel */}
      <div className="adm-card rounded-xl overflow-hidden">
        <div className="flex items-center" style={{ borderBottom: "1px solid var(--adm-border)" }}>
          {(["analyses", "scraping", "api"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? "text-sky-500 border-sky-500" : "adm-text-muted border-transparent"}`}>
              {t === "analyses" ? "Analyses" : t === "scraping" ? "Scraping" : "API Usage"}
            </button>
          ))}
          <div className="ml-auto pr-4">
            <select value={timeRange} onChange={(e) => { setTimeRange(e.target.value); setPage(1); }} className="adm-input adm-select text-xs rounded-md px-2 py-1.5">
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>

        {/* Analyses Tab */}
        {tab === "analyses" && (
          <div>
            <div className="flex flex-wrap gap-2 p-4 items-center" style={{ borderBottom: "1px solid var(--adm-border)" }}>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="adm-input adm-select rounded-md px-3 py-1.5 text-xs">
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="processing">Processing</option>
              </select>
              <select value={dataSourceFilter} onChange={(e) => { setDataSourceFilter(e.target.value); setPage(1); }} className="adm-input adm-select rounded-md px-3 py-1.5 text-xs">
                <option value="all">All sources</option>
                <option value="api+scrape">api+scrape</option>
                <option value="api-only">api-only</option>
              </select>
              <input type="text" placeholder="Search product code or title..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="ml-auto adm-input rounded-md px-3 py-1.5 text-xs min-w-[220px]" />
            </div>

            {loading && !data ? (
              <div className="p-12 text-center text-sm adm-text-muted">Loading...</div>
            ) : !data || data.analyses.items.length === 0 ? (
              <div className="p-12 text-center text-sm adm-text-muted">No analyses found</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
                        {["Product", "Score", "Status", "Source", "Comp.", "Created", "Actions"].map((h, i) => (
                          <th key={h} className={`${i === 0 ? "text-left" : i === 5 ? "text-right" : "text-center"} px-4 py-3 text-[11px] uppercase tracking-wider adm-text-muted font-medium`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.analyses.items.map((item) => (
                        <Fragment key={item.id}>
                          <tr onClick={() => fetchDetail(item.id)} className={`adm-row-hover cursor-pointer transition-colors ${expandedId === item.id ? "adm-elevated" : ""}`} style={{ borderBottom: "1px solid var(--adm-border)" }}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm adm-text-primary truncate max-w-[300px]">{item.productTitle || "Untitled"}</div>
                              <div className="text-[11px] adm-text-muted font-mono">{item.viatorProductCode}</div>
                            </td>
                            <td className="text-center px-4 py-3">
                              {item.overallScore !== null ? (
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-bold ${scoreBg(item.overallScore)}`}>{item.overallScore}</span>
                              ) : <span className="adm-text-faint">&mdash;</span>}
                            </td>
                            <td className="text-center px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusBadge(item.status)}`}>
                                {item.status === "processing" && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />}
                                {item.status}
                              </span>
                            </td>
                            <td className="text-center px-4 py-3">
                              {item.dataSource ? (
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${item.dataSource === "api+scrape" ? "bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20" : "bg-slate-500/10 adm-text-muted ring-1 ring-slate-500/20"}`}>{item.dataSource}</span>
                              ) : <span className="adm-text-faint">&mdash;</span>}
                            </td>
                            <td className="text-center px-4 py-3 text-sm adm-text-secondary font-mono">{item.competitorCount}</td>
                            <td className="text-right px-4 py-3 text-xs adm-text-muted">{timeAgo(item.createdAt)}</td>
                            <td className="text-center px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={(e) => rerunAnalysis(item.id, e)} disabled={actionLoading === item.id} className="p-1.5 rounded-md hover:bg-sky-500/10 adm-text-muted hover:text-sky-500 transition-colors disabled:opacity-30" title="Re-run">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </button>
                                <a href={`/report/${item.id}`} target="_blank" onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-md hover:bg-emerald-500/10 adm-text-muted hover:text-emerald-500 transition-colors" title="View report">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                                <button onClick={(e) => deleteAnalysis(item.id, e)} disabled={actionLoading === item.id} className="p-1.5 rounded-md hover:bg-red-500/10 adm-text-muted hover:text-red-500 transition-colors disabled:opacity-30" title="Delete">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedId === item.id && (
                            <tr><td colSpan={7} className="p-0"><DetailPanel detail={detail} loading={detailLoading} /></td></tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--adm-border)" }}>
                  <span className="text-xs adm-text-muted">{data.analyses.total} total &middot; page {page} of {totalPages}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="adm-btn px-3 py-1.5 text-xs rounded-md disabled:opacity-30">Previous</button>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="adm-btn px-3 py-1.5 text-xs rounded-md disabled:opacity-30">Next</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Scraping Tab */}
        {tab === "scraping" && data && (
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MiniCard label="Total Attempts" value={data.events.scraping.totalAttempts} />
              <MiniCard label="Successes" value={data.events.scraping.successCount} accent="emerald" />
              <MiniCard label="Blocked" value={data.events.scraping.blockedCount} accent="red" />
              <MiniCard label="Cache Hits" value={data.events.scraping.cacheHitCount} accent="violet" />
            </div>
            {data.events.scraping.totalAttempts > 0 && (
              <div className="mb-4 p-3 adm-elevated rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs adm-text-secondary">Success Rate</span>
                  <span className="text-xs font-mono adm-text-primary">{Math.round((data.events.scraping.successCount / data.events.scraping.totalAttempts) * 100)}%</span>
                </div>
                <div className="h-2 adm-bar-track rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all" style={{ width: `${(data.events.scraping.successCount / data.events.scraping.totalAttempts) * 100}%` }} />
                </div>
              </div>
            )}
            {data.events.scraping.recentEvents.length === 0 ? (
              <div className="p-8 text-center text-sm adm-text-muted">No scraping events recorded</div>
            ) : (
              <EventsTable events={data.events.scraping.recentEvents} columns={["Time", "Event", "URL", "Duration"]} renderRow={(ev) => (
                <>
                  <td className="px-3 py-2.5 adm-text-muted">{timeAgo(ev.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ev.event === "scrape_success" ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20" : ev.event === "scrape_blocked" ? "bg-red-500/10 text-red-600 ring-1 ring-red-500/20" : "bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20"}`}>
                      {ev.event.replace("scrape_", "")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 adm-text-muted truncate max-w-[300px] font-mono text-[11px]">{(ev.metadata?.url as string) || "\u2014"}</td>
                  <td className="px-3 py-2.5 text-right adm-text-muted font-mono">{ev.metadata?.durationMs ? formatDuration(Number(ev.metadata.durationMs)) : "\u2014"}</td>
                </>
              )} />
            )}
          </div>
        )}

        {/* API Tab */}
        {tab === "api" && data && (
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MiniCard label="Viator Today" value={data.events.api.viatorCallsToday} accent="sky" />
              <MiniCard label="Viator Total" value={data.events.api.viatorCallsTotal} accent="sky" />
              <MiniCard label="Claude Today" value={data.events.api.anthropicCallsToday} accent="amber" />
              <MiniCard label="Claude Total" value={data.events.api.anthropicCallsTotal} accent="amber" />
            </div>
            {data.events.api.recentEvents.length === 0 ? (
              <div className="p-8 text-center text-sm adm-text-muted">No API calls recorded</div>
            ) : (
              <EventsTable events={data.events.api.recentEvents} columns={["Time", "Service", "Endpoint", "Duration"]} renderRow={(ev) => (
                <>
                  <td className="px-3 py-2.5 adm-text-muted">{timeAgo(ev.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ev.metadata?.service === "viator" ? "bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20" : "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20"}`}>
                      {(ev.metadata?.service as string) || "unknown"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 adm-text-muted font-mono text-[11px]">{(ev.metadata?.endpoint as string) || "\u2014"}</td>
                  <td className="px-3 py-2.5 text-right adm-text-muted font-mono">{ev.metadata?.durationMs ? formatDuration(Number(ev.metadata.durationMs)) : "\u2014"}</td>
                </>
              )} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

type Accent = "sky" | "emerald" | "amber" | "red" | "violet" | "slate";
const accentText: Record<Accent, string> = {
  sky: "text-sky-500", emerald: "text-emerald-500", amber: "text-amber-500",
  red: "text-red-500", violet: "text-violet-500", slate: "adm-text-secondary",
};

function StatCard({ label, value, accent, sub }: { label: string; value: string | number; accent: Accent; sub: string }) {
  return (
    <div className="adm-card rounded-xl p-4 shadow-sm">
      <div className="text-[11px] uppercase tracking-wider adm-text-muted font-medium">{label}</div>
      <div className={`text-2xl font-bold mt-1 font-mono ${accentText[accent]}`}>{value}</div>
      <div className="text-[11px] adm-text-faint mt-0.5">{sub}</div>
    </div>
  );
}

function MiniCard({ label, value, accent = "slate" }: { label: string; value: number; accent?: Accent }) {
  return (
    <div className="adm-elevated rounded-lg p-3 text-center" style={{ border: "1px solid var(--adm-border)" }}>
      <div className="text-[10px] uppercase tracking-wider adm-text-muted font-medium">{label}</div>
      <div className={`text-xl font-bold mt-1 font-mono ${accentText[accent]}`}>{value}</div>
    </div>
  );
}

function ScoreDistributionChart({ distribution }: { distribution: number[] }) {
  const max = Math.max(...distribution, 1);
  const labels = ["0-20", "21-40", "41-60", "61-80", "81-100"];
  const colors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500", "bg-sky-500"];
  return (
    <div className="flex items-end gap-2 h-20">
      {distribution.map((count, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] font-mono adm-text-secondary">{count}</span>
          <div className="w-full adm-chart-track rounded-t-sm overflow-hidden relative" style={{ height: "48px" }}>
            <div className={`absolute bottom-0 w-full ${colors[i]} rounded-t-sm transition-all duration-500`} style={{ height: `${max > 0 ? (count / max) * 100 : 0}%` }} />
          </div>
          <span className="text-[10px] adm-text-muted">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function EventsTable({ events, columns, renderRow }: {
  events: { id: number; event: string; metadata: Record<string, unknown>; createdAt: string }[];
  columns: string[];
  renderRow: (ev: { id: number; event: string; metadata: Record<string, unknown>; createdAt: string }) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
            {columns.map((col, i) => (
              <th key={col} className={`px-3 py-2.5 text-[11px] uppercase tracking-wider adm-text-muted font-medium ${i === columns.length - 1 ? "text-right" : "text-left"}`}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id} className="adm-row-hover" style={{ borderBottom: "1px solid var(--adm-border)" }}>{renderRow(ev)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailPanel({ detail, loading }: { detail: AnalysisDetail | null; loading: boolean }) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  if (loading) return (
    <div className="p-6 adm-detail-bg text-center">
      <div className="inline-flex items-center gap-2 text-sm adm-text-muted">
        <span className="w-4 h-4 border-2 border-slate-400 border-t-sky-500 rounded-full animate-spin" />Loading...
      </div>
    </div>
  );

  if (!detail) return <div className="p-6 adm-detail-bg text-center text-sm text-red-500">Failed to load detail</div>;

  const categories = ["title", "description", "pricing", "reviews", "photos", "completeness"] as const;
  const categoryWeights: Record<string, number> = { title: 15, description: 15, pricing: 20, reviews: 25, photos: 15, completeness: 10 };

  return (
    <div className="adm-detail-bg p-5">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="text-base font-semibold adm-text-primary">{detail.productTitle || "Untitled"}</h3>
          <p className="text-[11px] adm-text-muted font-mono mt-0.5">
            {detail.viatorProductCode} &middot; {detail.dataSource || "api-only"} &middot; {detail.completedAt ? `completed ${timeAgo(detail.completedAt)}` : detail.status}
          </p>
        </div>
        <a href={`/report/${detail.id}`} target="_blank" className="text-xs text-sky-500 hover:text-sky-400">Open Report &rarr;</a>
      </div>

      {detail.scores && (
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-3">
            <span className={`text-3xl font-bold font-mono ${scoreColor(detail.overallScore)}`}>{detail.overallScore ?? "\u2014"}</span>
            <span className="text-xs adm-text-muted">Overall Score</span>
          </div>
          <div className="grid gap-2">
            {categories.map((cat) => {
              const score = detail.scores![cat];
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-[11px] adm-text-secondary w-24 capitalize">{cat} ({categoryWeights[cat]}%)</span>
                  <div className="flex-1 h-2 adm-bar-track rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
                  </div>
                  <span className={`text-xs font-mono w-8 text-right ${scoreColor(score)}`}>{score}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {detail.recommendations && detail.recommendations.length > 0 && (
        <div className="mb-5">
          <button onClick={() => setOpenSection(openSection === "recommendations" ? null : "recommendations")} className="flex items-center gap-2 text-xs font-medium adm-text-secondary mb-2">
            <span>{openSection === "recommendations" ? "\u25BC" : "\u25B6"}</span> Recommendations ({detail.recommendations.length})
          </button>
          {openSection === "recommendations" && (
            <div className="grid gap-2">
              {detail.recommendations.map((rec, i) => (
                <div key={i} className="adm-elevated rounded-lg p-3" style={{ border: "1px solid var(--adm-border)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityBadge(rec.priority)}`}>{rec.priority}</span>
                    <span className="text-[10px] adm-text-muted uppercase">{rec.category}</span>
                  </div>
                  <div className="text-sm font-medium adm-text-primary">{rec.title}</div>
                  <div className="text-xs adm-text-secondary mt-1">{rec.description}</div>
                  {rec.impact && <div className="text-[11px] text-emerald-500 mt-1">Impact: {rec.impact}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {detail.reviewInsights && (
        <div className="mb-5">
          <button onClick={() => setOpenSection(openSection === "insights" ? null : "insights")} className="flex items-center gap-2 text-xs font-medium adm-text-secondary mb-2">
            <span>{openSection === "insights" ? "\u25BC" : "\u25B6"}</span> Review Insights
          </button>
          {openSection === "insights" && (
            <div className="adm-elevated rounded-lg p-4 grid md:grid-cols-2 gap-4" style={{ border: "1px solid var(--adm-border)" }}>
              {detail.reviewInsights.sentiment && <div><div className="text-[10px] uppercase adm-text-muted mb-1">Sentiment</div><div className="text-sm adm-text-primary">{detail.reviewInsights.sentiment}</div></div>}
              {detail.reviewInsights.positives && detail.reviewInsights.positives.length > 0 && (
                <div><div className="text-[10px] uppercase text-emerald-500 mb-1">Positives</div><ul className="text-xs adm-text-secondary space-y-1">{detail.reviewInsights.positives.map((p, i) => <li key={i} className="flex gap-1.5"><span className="text-emerald-500">+</span>{p}</li>)}</ul></div>
              )}
              {detail.reviewInsights.negatives && detail.reviewInsights.negatives.length > 0 && (
                <div><div className="text-[10px] uppercase text-red-500 mb-1">Negatives</div><ul className="text-xs adm-text-secondary space-y-1">{detail.reviewInsights.negatives.map((n, i) => <li key={i} className="flex gap-1.5"><span className="text-red-500">-</span>{n}</li>)}</ul></div>
              )}
              {detail.reviewInsights.opportunities && detail.reviewInsights.opportunities.length > 0 && (
                <div><div className="text-[10px] uppercase text-amber-500 mb-1">Opportunities</div><ul className="text-xs adm-text-secondary space-y-1">{detail.reviewInsights.opportunities.map((o, i) => <li key={i} className="flex gap-1.5"><span className="text-amber-500">*</span>{o}</li>)}</ul></div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {[
          { key: "productData", label: "Product Data", desc: "Raw API response" },
          { key: "competitorsData", label: `Competitors (${(detail.competitorsData || []).length})`, desc: "Search results" },
        ].map(({ key, label, desc }) => (
          <div key={key}>
            <button onClick={() => setOpenSection(openSection === key ? null : key)} className="w-full text-left adm-elevated rounded-md p-3 hover:opacity-80 transition-all" style={{ border: "1px solid var(--adm-border)" }}>
              <div className="text-xs font-medium adm-text-secondary">{openSection === key ? "\u25BC" : "\u25B6"} {label}</div>
              <div className="text-[11px] adm-text-muted mt-0.5">{desc}</div>
            </button>
            {openSection === key && (
              <pre className="mt-1 p-3 adm-pre rounded-md text-[11px] adm-text-muted overflow-auto max-h-[400px] font-mono">
                {JSON.stringify(detail[key as keyof AnalysisDetail], null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
