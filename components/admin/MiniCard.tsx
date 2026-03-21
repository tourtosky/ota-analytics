import { Accent, accentText } from "./helpers";

export function MiniCard({ label, value, accent = "slate" }: { label: string; value: number; accent?: Accent }) {
  return (
    <div className="adm-elevated rounded-lg p-3 text-center" style={{ border: "1px solid var(--adm-border)" }}>
      <div className="text-[10px] uppercase tracking-wider adm-text-muted font-medium">{label}</div>
      <div className={`text-xl font-bold mt-1 font-mono ${accentText[accent]}`}>{value}</div>
    </div>
  );
}
