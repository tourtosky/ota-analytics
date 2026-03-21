"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { PLAN_LIMITS, PLAN_LABELS, type Plan } from "@/lib/plans";
import { PLAN_FEATURES } from "@/lib/plan-features";

interface ProfileData {
  email: string;
  fullName: string | null;
  companyName: string | null;
  plan: Plan;
  createdAt: string;
}

const planBadgeColors: Record<Plan, string> = {
  free: "bg-slate-100 text-slate-600 ring-slate-200",
  growth: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  pro: "bg-violet-50 text-violet-600 ring-violet-200",
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisCount, setAnalysisCount] = useState(0);

  // Form state
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/profile").then((r) => r.json()),
      fetch("/api/dashboard/analyses").then((r) => r.json()),
    ]).then(([profileData, analysesData]) => {
      if (!profileData.error) {
        setProfile(profileData);
        setFullName(profileData.fullName || "");
        setCompanyName(profileData.companyName || "");
      }
      setAnalysisCount(analysesData.total || 0);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, companyName }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setProfile(updated);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-cyan-700 animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const plan = profile.plan;
  const limit = PLAN_LIMITS[plan];
  const features = PLAN_FEATURES[plan];
  const usagePercent = limit === Infinity ? 0 : Math.min(100, Math.round((analysisCount / limit) * 100));
  const usageFull = limit !== Infinity && analysisCount >= limit;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight mb-2">Settings</h1>
      <p className="text-sm text-slate-400 mb-8">Manage your account and plan</p>

      <div className="max-w-2xl space-y-6">
        {/* ═══ Account ═══ */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-5">Account</h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
                placeholder="Your company"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-400 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed here</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 btn-gradient text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-700/20 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
              </button>

              {saveStatus === "saved" && (
                <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                  <Check className="w-4 h-4" /> Saved!
                </span>
              )}
              {saveStatus === "error" && (
                <span className="inline-flex items-center gap-1.5 text-sm text-red-500 font-medium">
                  <X className="w-4 h-4" /> Failed to save
                </span>
              )}
            </div>
          </form>
        </div>

        {/* ═══ Plan ═══ */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Current Plan</h2>
            {plan !== "pro" && (
              <Link
                href="/pricing"
                className="text-sm font-medium text-cyan-700 hover:text-cyan-800 transition-colors"
              >
                Upgrade &rarr;
              </Link>
            )}
          </div>

          {/* Plan badge */}
          <div className="mb-5">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ring-1 ${planBadgeColors[plan]}`}>
              {PLAN_LABELS[plan]}
            </span>
          </div>

          {/* Features */}
          <div className="space-y-2.5 mb-6">
            {features.included.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-slate-700">{f}</span>
              </div>
            ))}
            {features.excluded.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <span className="text-slate-400">{f}</span>
              </div>
            ))}
          </div>

          {/* Usage */}
          <div className="pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Listings used</span>
              <span className="text-sm font-mono font-bold text-slate-900">
                {limit === Infinity ? (
                  <>{analysisCount} / <span className="text-violet-600">Unlimited</span></>
                ) : (
                  <span className={usageFull ? "text-red-600" : ""}>{analysisCount} / {limit}</span>
                )}
              </span>
            </div>
            {limit !== Infinity && (
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usageFull ? "bg-red-500" : usagePercent >= 80 ? "bg-amber-500" : "bg-cyan-500"}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
