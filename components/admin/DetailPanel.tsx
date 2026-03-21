"use client";

import { useState } from "react";
import { AnalysisDetail } from "./types";
import { timeAgo, scoreColor, priorityBadge } from "./helpers";

export function DetailPanel({ detail, loading }: { detail: AnalysisDetail | null; loading: boolean }) {
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
