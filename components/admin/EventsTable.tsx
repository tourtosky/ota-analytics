import { AdminEvent } from "./types";

export function EventsTable({ events, columns, renderRow }: {
  events: AdminEvent[];
  columns: string[];
  renderRow: (ev: AdminEvent) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
            {columns.map((col, i) => (
              <th key={col} className={`px-3 py-2.5 text-[11px] uppercase tracking-wider adm-text-muted font-medium ${i === columns.length - 1 ? "text-right" : "text-left"}`}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id} className="adm-row-hover" style={{ borderBottom: "1px solid var(--adm-border)" }}>{renderRow(ev)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
