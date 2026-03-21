"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { DashboardData, AnalysisDetail } from "@/components/admin/types";
import { DetailPanel } from "@/components/admin/DetailPanel";
import { timeAgo, scoreBg, statusBadge } from "@/components/admin/helpers";

export default function AnalysesPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, dataSourceFilter, searchDebounced, timeRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold adm-text-primary tracking-tight">Analyses</h1>
          <p className="text-xs adm-text-muted mt-0.5">{data ? `${data.analyses.total} total` : "Loading..."}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-500">{error}</span>
          <button onClick={() => { setError(null); setLoading(true); fetchData(); }} className="text-xs text-red-400 font-medium hover:underline">Retry</button>
        </div>
      )}

      <div className="adm-card rounded-xl overflow-hidden">
        {/* Filters */}
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
          <select value={timeRange} onChange={(e) => { setTimeRange(e.target.value); setPage(1); }} className="adm-input adm-select rounded-md px-3 py-1.5 text-xs">
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <input type="text" placeholder="Search product code or title..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="ml-auto adm-input rounded-md px-3 py-1.5 text-xs min-w-[220px]" />
        </div>

        {/* Table */}
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
    </div>
  );
}
