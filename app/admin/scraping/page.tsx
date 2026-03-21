"use client";

import { useState, useEffect, useCallback } from "react";
import { MiniCard } from "@/components/admin/MiniCard";
import { EventsTable } from "@/components/admin/EventsTable";
import { DashboardData } from "@/components/admin/types";
import { timeAgo, formatDuration } from "@/components/admin/helpers";

export default function ScrapingPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
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

  const scraping = data?.events.scraping;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold adm-text-primary tracking-tight">Scraping</h1>
          <p className="text-xs adm-text-muted mt-0.5">ZenRows scraping monitoring</p>
        </div>
        <button onClick={() => { setLoading(true); fetchData(); }} className="adm-btn px-2.5 py-1.5 text-xs rounded-md transition-colors">Refresh</button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-500">{error}</span>
          <button onClick={() => { setError(null); setLoading(true); fetchData(); }} className="text-xs text-red-400 font-medium hover:underline">Retry</button>
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="adm-card rounded-xl p-4 animate-pulse">
              <div className="h-3 adm-skeleton rounded w-20 mb-3" />
              <div className="h-8 adm-skeleton rounded w-16" />
            </div>
          ))}
        </div>
      ) : scraping ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <MiniCard label="Total Attempts" value={scraping.totalAttempts} />
            <MiniCard label="Successes" value={scraping.successCount} accent="emerald" />
            <MiniCard label="Blocked" value={scraping.blockedCount} accent="red" />
            <MiniCard label="Cache Hits" value={scraping.cacheHitCount} accent="violet" />
          </div>

          {scraping.totalAttempts > 0 && (
            <div className="adm-card rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs adm-text-secondary">Success Rate</span>
                <span className="text-xs font-mono adm-text-primary">{Math.round((scraping.successCount / scraping.totalAttempts) * 100)}%</span>
              </div>
              <div className="h-2 adm-bar-track rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all" style={{ width: `${(scraping.successCount / scraping.totalAttempts) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="adm-card rounded-xl overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
              <h3 className="text-xs uppercase tracking-wider adm-text-muted font-medium">Recent Events</h3>
            </div>
            {scraping.recentEvents.length === 0 ? (
              <div className="p-8 text-center text-sm adm-text-muted">No scraping events recorded</div>
            ) : (
              <EventsTable events={scraping.recentEvents} columns={["Time", "Event", "URL", "Duration"]} renderRow={(ev) => (
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
        </>
      ) : null}
    </div>
  );
}
