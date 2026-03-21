import { Accent, accentText } from "./helpers";

export function StatCard({ label, value, accent, sub }: { label: string; value: string | number; accent: Accent; sub: string }) {
  return (
    <div className="adm-card rounded-xl p-4 shadow-sm">
      <div className="text-[11px] uppercase tracking-wider adm-text-muted font-medium">{label}</div>
      <div className={`text-2xl font-bold mt-1 font-mono ${accentText[accent]}`}>{value}</div>
      <div className="text-[11px] adm-text-faint mt-0.5">{sub}</div>
    </div>
  );
}
