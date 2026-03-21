"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { StatCard } from "@/components/admin/StatCard";
import { ScoreDistributionChart } from "@/components/admin/ScoreDistributionChart";
import { formatDuration, timeAgo, scoreBg, statusBadge } from "@/components/admin/helpers";
import { DashboardData } from "@/components/admin/types";

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10);
  const [countdown, setCountdown] = useState(10);
  const countdownRef = useRef(10);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats?page=1");
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold adm-text-primary tracking-tight">Dashboard</h1>
          <p className="text-xs adm-text-muted mt-0.5">System overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button onClick={() => { setLoading(true); fetchData(); }} className="adm-btn px-2.5 py-1.5 rounded-md transition-colors">Refresh</button>
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
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-500">{error}</span>
          <button onClick={() => { setError(null); setLoading(true); fetchData(); }} className="text-xs text-red-400 font-medium hover:underline">Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
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

      {/* Recent Analyses */}
      <div className="adm-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
          <h3 className="text-xs uppercase tracking-wider adm-text-muted font-medium">Recent Analyses</h3>
          <Link href="/admin/analyses" className="text-xs text-sky-500 hover:text-sky-400 font-medium">View all &rarr;</Link>
        </div>

        {loading && !data ? (
          <div className="p-12 text-center text-sm adm-text-muted">Loading...</div>
        ) : !data || data.analyses.items.length === 0 ? (
          <div className="p-12 text-center text-sm adm-text-muted">No analyses yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
                  {["Product", "Score", "Status", "Created"].map((h, i) => (
                    <th key={h} className={`${i === 0 ? "text-left" : i === 3 ? "text-right" : "text-center"} px-4 py-3 text-[11px] uppercase tracking-wider adm-text-muted font-medium`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.analyses.items.slice(0, 8).map((item) => (
                  <tr key={item.id} className="adm-row-hover" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                    <td className="px-4 py-3">
                      <Link href={`/report/${item.id}`} className="hover:text-sky-500 transition-colors">
                        <div className="font-medium text-sm adm-text-primary truncate max-w-[300px]">{item.productTitle || "Untitled"}</div>
                        <div className="text-[11px] adm-text-muted font-mono">{item.viatorProductCode}</div>
                      </Link>
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
                    <td className="text-right px-4 py-3 text-xs adm-text-muted">{timeAgo(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        {[
          { href: "/admin/analyses", label: "Analyses", desc: `${data?.stats.totalAnalyses ?? 0} total`, color: "text-sky-500" },
          { href: "/admin/scraping", label: "Scraping", desc: `${data?.stats.scrapeSuccessRate ?? 0}% success`, color: "text-emerald-500" },
          { href: "/admin/api-usage", label: "API Usage", desc: `${(data?.events.api.viatorCallsToday ?? 0) + (data?.events.api.anthropicCallsToday ?? 0)} today`, color: "text-amber-500" },
          { href: "/admin/clients", label: "Clients", desc: "Manage users", color: "text-violet-500" },
        ].map((link) => (
          <Link key={link.href} href={link.href} className="adm-card rounded-xl p-4 hover:shadow-md transition-all group">
            <div className={`text-sm font-semibold ${link.color} group-hover:underline`}>{link.label}</div>
            <div className="text-[11px] adm-text-muted mt-0.5">{link.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
