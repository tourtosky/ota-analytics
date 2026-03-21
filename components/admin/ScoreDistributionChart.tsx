export function ScoreDistributionChart({ distribution }: { distribution: number[] }) {
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
