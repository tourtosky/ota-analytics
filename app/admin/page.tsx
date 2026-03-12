"use client";

import { useState, useEffect, useCallback, Fragment } from "react";

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
  recommendations: Record<string, unknown>[] | null;
  reviewInsights: Record<string, unknown> | null;
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

function scoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-gray-50 text-gray-400";
  if (score >= 70) return "bg-green-50 text-green-600";
  if (score >= 40) return "bg-yellow-50 text-yellow-600";
  return "bg-red-50 text-red-600";
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: "bg-green-50 text-green-600",
    failed: "bg-red-50 text-red-600",
    processing: "bg-blue-50 text-blue-600",
    pending: "bg-gray-100 text-gray-500",
  };
  return map[status] || "bg-gray-100 text-gray-500";
}

function dataSourceBadge(ds: string | null) {
  if (ds === "api+scrape") return "bg-blue-50 text-blue-600";
  return "bg-gray-100 text-gray-500";
}

// ─── Component ───────────────────────────────────────────────

export default function AdminPage() {
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

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AnalysisDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Debounce search input
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
  }, [page, statusFilter, dataSourceFilter, searchDebounced]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/analysis/${id}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      setDetail(await res.json());
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = data ? Math.ceil(data.analyses.total / data.analyses.pageSize) : 0;

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] p-6 md:p-8" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]">
            Tour<span className="text-[#0ea5e9]">Boost</span> Admin
          </h1>
          <p className="text-sm text-[#64748b]">System dashboard</p>
        </div>
        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
          {process.env.NODE_ENV === "production" ? "PRODUCTION" : "DEVELOPMENT"}
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={() => { setError(null); setLoading(true); fetchData(); }}
            className="text-xs text-red-600 font-medium hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#e2e8f0] rounded-lg p-4 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-20 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-2 bg-gray-200 rounded w-24" />
            </div>
          ))
        ) : data ? (
          <>
            <StatCard label="Total Analyses" value={data.stats.totalAnalyses} color="#0ea5e9" sub={`+${data.stats.todayCount} today`} />
            <StatCard label="Success Rate" value={`${data.stats.successRate}%`} color="#16a34a" sub="completed / total" />
            <StatCard label="Avg Score" value={data.stats.avgScore} color="#ca8a04" sub="across all analyses" />
            <StatCard label="Scrape Rate" value={`${data.stats.scrapeSuccessRate}%`} color={data.stats.scrapeSuccessRate > 50 ? "#16a34a" : "#dc2626"} sub={data.stats.scrapeSuccessRate === 0 ? "DataDome blocking" : "success rate"} />
            <StatCard label="Cache Entries" value={data.stats.cacheEntries} color="#9333ea" sub="scraped pages cached" />
          </>
        ) : null}
      </div>

      {/* Tabbed Panel */}
      <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-[#e2e8f0]">
          {(["analyses", "scraping", "api"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "text-[#0ea5e9] border-[#0ea5e9]"
                  : "text-[#94a3b8] border-transparent hover:text-[#64748b]"
              }`}
            >
              {t === "analyses" ? "Analyses" : t === "scraping" ? "Scraping Health" : "API Usage"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "analyses" && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-2 p-4 border-b border-[#f1f5f9] items-center">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md px-3 py-1.5 text-xs text-[#64748b]"
              >
                <option value="all">Status: All</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="processing">Processing</option>
              </select>
              <select
                value={dataSourceFilter}
                onChange={(e) => { setDataSourceFilter(e.target.value); setPage(1); }}
                className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md px-3 py-1.5 text-xs text-[#64748b]"
              >
                <option value="all">Data Source: All</option>
                <option value="api+scrape">api+scrape</option>
                <option value="api-only">api-only</option>
              </select>
              <input
                type="text"
                placeholder="Search product code..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="ml-auto bg-[#f8fafc] border border-[#e2e8f0] rounded-md px-3 py-1.5 text-xs text-[#64748b] min-w-[200px]"
              />
            </div>

            {/* Table */}
            {loading ? (
              <div className="p-8 text-center text-sm text-[#94a3b8]">Loading...</div>
            ) : !data || data.analyses.items.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#94a3b8]">No analyses yet</div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#f1f5f9]">
                      <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">Product</th>
                      <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">Score</th>
                      <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">Status</th>
                      <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">Data Source</th>
                      <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">Competitors</th>
                      <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.analyses.items.map((item) => (
                      <Fragment key={item.id}>
                        <tr
                          onClick={() => fetchDetail(item.id)}
                          className="hover:bg-[#f8fafc] cursor-pointer border-b border-[#f8fafc]"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-sm text-[#0f172a]">{item.productTitle || "Untitled"}</div>
                            <div className="text-[11px] text-[#94a3b8] font-mono">{item.viatorProductCode}</div>
                          </td>
                          <td className="text-center px-4 py-3">
                            {item.overallScore !== null ? (
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-bold ${scoreBg(item.overallScore)}`}>
                                {item.overallScore}
                              </span>
                            ) : (
                              <span className="text-[#cbd5e1]">&mdash;</span>
                            )}
                          </td>
                          <td className="text-center px-4 py-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusBadge(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="text-center px-4 py-3">
                            {item.dataSource ? (
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${dataSourceBadge(item.dataSource)}`}>
                                {item.dataSource}
                              </span>
                            ) : (
                              <span className="text-[#cbd5e1]">&mdash;</span>
                            )}
                          </td>
                          <td className="text-center px-4 py-3 text-sm text-[#64748b]">{item.competitorCount}</td>
                          <td className="text-right px-4 py-3 text-xs text-[#94a3b8]">{timeAgo(item.createdAt)}</td>
                        </tr>
                        {expandedId === item.id && (
                          <tr>
                            <td colSpan={6} className="p-0">
                              <DetailPanel detail={detail} loading={detailLoading} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="text-center py-3 border-t border-[#f1f5f9] text-xs text-[#94a3b8]">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-[#0ea5e9] disabled:text-[#cbd5e1] mr-2"
                  >
                    &larr; Previous
                  </button>
                  Page {page} of {totalPages}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="text-[#0ea5e9] disabled:text-[#cbd5e1] ml-2"
                  >
                    Next &rarr;
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "scraping" && data && (
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MiniCard label="Total Attempts" value={data.events.scraping.totalAttempts} />
              <MiniCard label="Successes" value={data.events.scraping.successCount} color="#16a34a" />
              <MiniCard label="DataDome Blocks" value={data.events.scraping.blockedCount} color="#dc2626" />
              <MiniCard label="Cache Hits" value={data.events.scraping.cacheHitCount} color="#9333ea" />
            </div>
            {data.events.scraping.recentEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#94a3b8]">No scraping events recorded</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#f1f5f9]">
                    <th className="text-left px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">Time</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">Event</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">URL</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.scraping.recentEvents.map((ev) => (
                    <tr key={ev.id} className="border-b border-[#f8fafc] text-xs">
                      <td className="px-3 py-2 text-[#94a3b8]">{timeAgo(ev.createdAt)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          ev.event === "scrape_success" ? "bg-green-50 text-green-600" :
                          ev.event === "scrape_blocked" ? "bg-red-50 text-red-600" :
                          "bg-purple-50 text-purple-600"
                        }`}>
                          {ev.event.replace("scrape_", "")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#64748b] truncate max-w-[300px]">{(ev.metadata?.url as string) || "\u2014"}</td>
                      <td className="px-3 py-2 text-right text-[#94a3b8]">
                        {ev.metadata?.durationMs ? `${ev.metadata.durationMs}ms` : "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "api" && data && (
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MiniCard label="Viator Today" value={data.events.api.viatorCallsToday} />
              <MiniCard label="Viator Total" value={data.events.api.viatorCallsTotal} />
              <MiniCard label="Anthropic Today" value={data.events.api.anthropicCallsToday} color="#ca8a04" />
              <MiniCard label="Anthropic Total" value={data.events.api.anthropicCallsTotal} color="#ca8a04" />
            </div>
            {data.events.api.recentEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#94a3b8]">No API calls recorded</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#f1f5f9]">
                    <th className="text-left px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">Time</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">Service</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">Endpoint</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase text-[#94a3b8] font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.api.recentEvents.map((ev) => (
                    <tr key={ev.id} className="border-b border-[#f8fafc] text-xs">
                      <td className="px-3 py-2 text-[#94a3b8]">{timeAgo(ev.createdAt)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          ev.metadata?.service === "viator" ? "bg-blue-50 text-blue-600" : "bg-yellow-50 text-yellow-700"
                        }`}>
                          {(ev.metadata?.service as string) || "unknown"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#64748b]">{(ev.metadata?.endpoint as string) || "\u2014"}</td>
                      <td className="px-3 py-2 text-right text-[#94a3b8]">
                        {ev.metadata?.durationMs ? `${ev.metadata.durationMs}ms` : "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub: string }) {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 text-center shadow-sm">
      <div className="text-[11px] uppercase tracking-wider text-[#94a3b8] font-medium">{label}</div>
      <div className="text-3xl font-bold my-1" style={{ color }}>{value}</div>
      <div className="text-[11px] text-[#94a3b8]">{sub}</div>
    </div>
  );
}

function MiniCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-[#94a3b8] font-medium">{label}</div>
      <div className="text-xl font-bold mt-1" style={{ color: color || "#334155" }}>{value}</div>
    </div>
  );
}

function DetailPanel({ detail, loading }: { detail: AnalysisDetail | null; loading: boolean }) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  if (loading) {
    return <div className="p-6 bg-[#f8fafc] text-center text-sm text-[#94a3b8]">Loading detail...</div>;
  }

  if (!detail) {
    return <div className="p-6 bg-[#f8fafc] text-center text-sm text-red-500">Failed to load detail</div>;
  }

  const categories = ["title", "description", "pricing", "reviews", "photos", "completeness"] as const;

  return (
    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg m-3 p-5">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-base font-semibold text-[#0f172a]">{detail.productTitle || "Untitled"}</h3>
          <p className="text-[11px] text-[#94a3b8] font-mono mt-0.5">
            ID: {detail.id.slice(0, 18)} &bull; Code: {detail.viatorProductCode}
          </p>
        </div>
        <a
          href={`/report/${detail.id}`}
          target="_blank"
          className="text-xs text-[#0ea5e9] hover:underline"
        >
          View Report &rarr;
        </a>
      </div>

      {/* Scores grid */}
      {detail.scores && (
        <div className="grid grid-cols-7 gap-2 mb-4">
          <div className="text-center p-2.5 bg-white border border-[#e2e8f0] rounded-md">
            <div className="text-[10px] text-[#94a3b8]">Overall</div>
            <div className={`text-lg font-bold ${scoreColor(detail.overallScore)}`}>{detail.overallScore ?? "\u2014"}</div>
          </div>
          {categories.map((cat) => (
            <div key={cat} className="text-center p-2.5 bg-white border border-[#e2e8f0] rounded-md">
              <div className="text-[10px] text-[#94a3b8] capitalize">{cat}</div>
              <div className={`text-lg font-bold ${scoreColor(detail.scores![cat])}`}>{detail.scores![cat]}</div>
            </div>
          ))}
        </div>
      )}

      {/* Expandable sections */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: "productData", label: "Product Data (JSON)", desc: `dataSource: ${detail.dataSource || "api-only"}` },
          { key: "competitorsData", label: `Competitors (${(detail.competitorsData || []).length})`, desc: "Competitor details" },
          { key: "recommendations", label: `Recommendations (${(detail.recommendations || []).length})`, desc: "AI-generated recommendations" },
          { key: "reviewInsights", label: "Review Insights", desc: "Sentiment analysis" },
        ].map(({ key, label, desc }) => (
          <div key={key}>
            <button
              onClick={() => setOpenSection(openSection === key ? null : key)}
              className="w-full text-left bg-white border border-[#e2e8f0] rounded-md p-3 hover:border-[#cbd5e1] transition-colors"
            >
              <div className="text-xs font-semibold text-[#334155]">
                {openSection === key ? "\u25BC" : "\u25B6"} {label}
              </div>
              <div className="text-[11px] text-[#94a3b8] mt-0.5">{desc}</div>
            </button>
            {openSection === key && (
              <pre className="mt-1 p-3 bg-white border border-[#e2e8f0] rounded-md text-[11px] text-[#64748b] overflow-auto max-h-[400px] font-mono">
                {JSON.stringify(detail[key as keyof AnalysisDetail], null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
