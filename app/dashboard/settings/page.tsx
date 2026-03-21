"use client";

import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight mb-2">Settings</h1>
      <p className="text-sm text-slate-400 mb-8">Manage your account and preferences</p>

      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Settings className="w-7 h-7 text-slate-300" />
        </div>
        <h3 className="text-lg font-display font-bold text-slate-900 mb-2">Coming soon</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Profile settings, notification preferences, and billing management are on the way.
        </p>
      </div>
    </div>
  );
}
