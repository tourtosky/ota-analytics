"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import "./theme.css";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = localStorage.getItem("admin-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => { localStorage.setItem("admin-theme", theme); }, [theme]);
  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}

const nav = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/admin/analyses",
    label: "Analyses",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    href: "/admin/scraping",
    label: "Scraping",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
  {
    href: "/admin/api-usage",
    label: "API Usage",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    href: "/admin/blog",
    label: "Blog",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: "/admin/clients",
    label: "Clients",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  // Role-based access check
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.error || !data.role) { router.push("/login"); return; }
        if (data.role !== "admin") { router.push("/dashboard"); return; }
        setAuthorized(true);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  if (!authorized) {
    return (
      <div className={`admin-theme ${theme === "light" ? "light" : ""} min-h-screen flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-400 border-t-sky-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm adm-text-muted">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-theme ${theme === "light" ? "light" : ""} min-h-screen flex`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-56 flex flex-col transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`} style={{ backgroundColor: "var(--adm-bg)", borderRight: "1px solid var(--adm-border)" }}>
        {/* Logo */}
        <div className="h-14 flex items-center px-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--adm-border)" }}>
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight adm-text-primary">
              Peregr<span className="text-sky-500">io</span>
            </span>
            <span className="text-[10px] adm-text-muted font-normal">Admin</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-sky-500/10 text-sky-500"
                    : "adm-text-secondary hover:adm-text-primary hover:bg-[var(--adm-bg-card-hover)]"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div className="p-3 space-y-1 flex-shrink-0" style={{ borderTop: "1px solid var(--adm-border)" }}>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="flex-1 adm-btn px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5">
              {theme === "dark" ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <span className="text-[10px] bg-sky-500/10 text-sky-500 px-2 py-2 rounded-lg font-mono ring-1 ring-sky-500/20">
              {process.env.NODE_ENV === "production" ? "PROD" : "DEV"}
            </span>
          </div>
          <button onClick={handleLogout} className="w-full adm-btn px-2.5 py-2 text-xs rounded-lg hover:!text-red-500 transition-colors">
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-56 min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden h-14 flex items-center px-4 sticky top-0 z-20" style={{ backgroundColor: "var(--adm-bg)", borderBottom: "1px solid var(--adm-border)" }}>
          <button onClick={() => setSidebarOpen(true)} className="adm-btn p-2 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-3 text-sm font-bold adm-text-primary">
            Peregr<span className="text-sky-500">io</span>
            <span className="adm-text-muted font-normal ml-1">Admin</span>
          </span>
        </div>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
