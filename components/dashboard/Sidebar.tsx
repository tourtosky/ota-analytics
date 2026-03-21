"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { LayoutDashboard, BarChart3, Settings, LogOut, Menu, X } from "lucide-react";
import { PLAN_LABELS, type Plan } from "@/lib/plans";

interface UserInfo {
  email: string;
  fullName: string | null;
  plan: Plan;
}

const planBadgeStyles: Record<Plan, string> = {
  free: "bg-slate-100 text-slate-500",
  growth: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
  pro: "bg-violet-50 text-violet-600 ring-1 ring-violet-200",
};

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/listings", label: "My Listings", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setUser({ email: data.email, fullName: data.fullName, plan: data.plan || "free" });
      });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-6 flex-shrink-0 border-b border-slate-200">
        <Link href="/dashboard" className="text-base font-bold tracking-tight text-slate-900">
          tour<span className="text-cyan-700">boost</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-3 space-y-1">
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-cyan-50 text-cyan-700 font-semibold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="p-4 border-t border-slate-200 flex-shrink-0">
          <Link href="/dashboard/settings" onClick={() => setOpen(false)} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer mb-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-900 truncate">{user.fullName || "User"}</p>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${planBadgeStyles[user.plan]}`}>
                  {PLAN_LABELS[user.plan]}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col bg-white border-r border-slate-200">
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white border-b border-slate-200 flex items-center px-4">
        <button onClick={() => setOpen(true)} className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-50">
          <Menu className="w-5 h-5" />
        </button>
        <span className="ml-3 text-sm font-bold text-slate-900">
          tour<span className="text-cyan-700">boost</span>
        </span>
      </div>

      {/* Mobile overlay */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-60 flex flex-col bg-white lg:hidden">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
