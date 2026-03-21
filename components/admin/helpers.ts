export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function scoreColor(score: number | null): string {
  if (score === null) return "adm-text-muted";
  if (score >= 70) return "text-emerald-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

export function scoreBg(score: number | null): string {
  if (score === null) return "bg-slate-500/10 adm-text-muted";
  if (score >= 70) return "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20";
  if (score >= 40) return "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20";
  return "bg-red-500/10 text-red-600 ring-1 ring-red-500/20";
}

export function statusBadge(status: string): string {
  const map: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20",
    failed: "bg-red-500/10 text-red-600 ring-1 ring-red-500/20",
    processing: "bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20",
    pending: "bg-slate-500/10 adm-text-muted ring-1 ring-slate-500/20",
  };
  return map[status] || "bg-slate-500/10 adm-text-muted";
}

export function priorityBadge(priority: string): string {
  const map: Record<string, string> = {
    high: "bg-red-500/10 text-red-600 ring-1 ring-red-500/20",
    medium: "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20",
    low: "bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20",
  };
  return map[priority] || "bg-slate-500/10 adm-text-muted";
}

export type Accent = "sky" | "emerald" | "amber" | "red" | "violet" | "slate";

export const accentText: Record<Accent, string> = {
  sky: "text-sky-500",
  emerald: "text-emerald-500",
  amber: "text-amber-500",
  red: "text-red-500",
  violet: "text-violet-500",
  slate: "adm-text-secondary",
};
