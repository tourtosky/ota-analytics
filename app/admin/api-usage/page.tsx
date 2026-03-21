"use client";

import { useState, useEffect, useCallback } from "react";
import { MiniCard } from "@/components/admin/MiniCard";
import { EventsTable } from "@/components/admin/EventsTable";
import { DashboardData } from "@/components/admin/types";
import { timeAgo, formatDuration } from "@/components/admin/helpers";

export default function ApiUsagePage() {
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

  const api = data?.events.api;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold adm-text-primary tracking-tight">API Usage</h1>
          <p className="text-xs adm-text-muted mt-0.5">Viator & Claude API call monitoring</p>
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
      ) : api ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <MiniCard label="Viator Today" value={api.viatorCallsToday} accent="sky" />
            <MiniCard label="Viator Total" value={api.viatorCallsTotal} accent="sky" />
            <MiniCard label="Claude Today" value={api.anthropicCallsToday} accent="amber" />
            <MiniCard label="Claude Total" value={api.anthropicCallsTotal} accent="amber" />
          </div>

          <div className="adm-card rounded-xl overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--adm-border)" }}>
              <h3 className="text-xs uppercase tracking-wider adm-text-muted font-medium">Recent API Calls</h3>
            </div>
            {api.recentEvents.length === 0 ? (
              <div className="p-8 text-center text-sm adm-text-muted">No API calls recorded</div>
            ) : (
              <EventsTable events={api.recentEvents} columns={["Time", "Service", "Endpoint", "Duration"]} renderRow={(ev) => (
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
        </>
      ) : null}
    </div>
  );
}
