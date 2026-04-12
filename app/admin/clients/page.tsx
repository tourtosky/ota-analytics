"use client";

import { useState, useEffect, useCallback } from "react";
import { timeAgo } from "@/components/admin/helpers";

type Plan = "free" | "growth" | "pro";

interface Client {
  id: string;
  email: string | null;
  role: "admin" | "client";
  plan: Plan;
  fullName: string | null;
  companyName: string | null;
  createdAt: string;
  analysisCount: number;
}

const planStyles: Record<Plan, string> = {
  free: "bg-slate-500/10 adm-text-secondary ring-1 ring-slate-500/20",
  growth: "bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20",
  pro: "bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients");
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setClients(data.clients);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const updateClient = async (userId: string, patch: { role?: string; plan?: string }) => {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...patch }),
      });
      if (!res.ok) throw new Error("Failed to update");
      // Optimistic update
      setClients((prev) => prev.map((c) =>
        c.id === userId ? { ...c, ...patch } as Client : c
      ));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "client" : "admin";
    if (!confirm(`Change role to "${newRole}"?`)) return;
    await updateClient(userId, { role: newRole });
  };

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.fullName?.toLowerCase().includes(q)) ||
      (c.email?.toLowerCase().includes(q)) ||
      (c.companyName?.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold adm-text-primary tracking-tight">Clients</h1>
          <p className="text-xs adm-text-muted mt-0.5">{clients.length} registered users</p>
        </div>
        <button onClick={() => { setLoading(true); fetchClients(); }} className="adm-btn px-2.5 py-1.5 text-xs rounded-md transition-colors">Refresh</button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-500">{error}</span>
          <button onClick={() => { setError(null); setLoading(true); fetchClients(); }} className="text-xs text-red-400 font-medium hover:underline">Retry</button>
        </div>
      )}

      <div className="adm-card rounded-xl overflow-hidden">
        {/* Search */}
        <div className="p-4" style={{ borderBottom: "1px solid var(--adm-border)" }}>
          <input
            type="text"
            placeholder="Search by name, company, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="adm-input rounded-md px-3 py-1.5 text-xs w-full max-w-xs"
          />
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm adm-text-muted">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm adm-text-muted">No clients found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--adm-border)" }}>
                  {["Name", "Email", "Company", "Role", "Plan", "Analyses", "Joined", "Actions"].map((h, i) => (
                    <th key={h} className={`${i === 0 ? "text-left" : i === 6 ? "text-right" : "text-center"} px-4 py-3 text-[11px] uppercase tracking-wider adm-text-muted font-medium`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} className="adm-row-hover" style={{ borderBottom: "1px solid var(--adm-border)" }}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm adm-text-primary">{client.fullName || "No name"}</div>
                      <div className="text-[11px] adm-text-muted font-mono truncate max-w-[200px]">{client.id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm adm-text-secondary">{client.email || "\u2014"}</td>
                    <td className="text-center px-4 py-3 text-sm adm-text-secondary">{client.companyName || "\u2014"}</td>
                    <td className="text-center px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        client.role === "admin"
                          ? "bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20"
                          : "bg-slate-500/10 adm-text-secondary ring-1 ring-slate-500/20"
                      }`}>
                        {client.role}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <select
                        value={client.plan}
                        onChange={(e) => updateClient(client.id, { plan: e.target.value })}
                        disabled={actionLoading === client.id}
                        className={`appearance-none cursor-pointer px-2.5 py-0.5 rounded-full text-[11px] font-medium border-0 outline-none text-center disabled:opacity-30 ${planStyles[client.plan]}`}
                      >
                        <option value="free">free</option>
                        <option value="growth">growth</option>
                        <option value="pro">pro</option>
                      </select>
                    </td>
                    <td className="text-center px-4 py-3 text-sm adm-text-secondary font-mono">{client.analysisCount}</td>
                    <td className="text-right px-4 py-3 text-xs adm-text-muted">{timeAgo(client.createdAt)}</td>
                    <td className="text-center px-4 py-3">
                      <button
                        onClick={() => toggleRole(client.id, client.role)}
                        disabled={actionLoading === client.id}
                        className="adm-btn px-2.5 py-1 text-[11px] rounded-md transition-colors disabled:opacity-30"
                      >
                        {actionLoading === client.id ? "..." : client.role === "admin" ? "Make Client" : "Make Admin"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
