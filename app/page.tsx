"use client";

import { useState, useEffect } from "react";
import WaitlistModal from "@/components/WaitlistModal";
import { motion } from "framer-motion";
import { TrendingUp, Star, Users } from "lucide-react";

export default function Home() {
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => { if (!data.error) setIsAuthenticated(true); })
      .catch(() => {});
  }, []);

  return (
    <main className="bg-white text-slate-900 selection:bg-cyan-100 overflow-x-hidden">
      <WaitlistModal open={showWaitlist} onClose={() => setShowWaitlist(false)} />

      {/* ═══════════ NAV ═══════════ */}
      <nav className="fixed top-0 w-full z-50 px-6">
        <div className="max-w-6xl mx-auto mt-4 px-6 h-14 flex items-center justify-between rounded-2xl bg-white/80 backdrop-blur-2xl border border-slate-200 shadow-sm">
          <span className="text-base font-bold tracking-tight">
            peregr<span className="text-cyan-700">io</span>
          </span>
          <div className="flex items-center gap-6 text-sm">
            <a href="/pricing" className="text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">Pricing</a>
            {isAuthenticated ? (
              <a href="/dashboard" className="px-4 py-1.5 rounded-lg btn-gradient text-white text-sm font-medium transition-all shadow-sm">
                Dashboard →
              </a>
            ) : (
              <button
                onClick={() => setShowWaitlist(true)}
                className="px-4 py-1.5 rounded-lg btn-gradient text-white text-sm font-medium transition-all shadow-sm"
              >
                Join waitlist
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6">
        <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-cyan-100/50 blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-100/40 blur-[120px]" />

        <div className="relative z-10 max-w-3xl mx-auto text-center pt-24 pb-16">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="mb-5 md:mb-6">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-700/80 font-medium">
              <span className="w-6 h-px bg-cyan-700/30" />
              Growth intelligence for tour operators
              <span className="w-6 h-px bg-cyan-700/30" />
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1 }}
            className="text-[2.5rem] sm:text-[3.25rem] md:text-[4.5rem] leading-[1.05] font-display font-bold tracking-tight mb-6 md:mb-8 text-slate-900"
          >
            Know exactly why you&apos;re
            <br />
            <span className="gradient-text">losing bookings.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="text-base md:text-lg text-slate-500 leading-relaxed mb-10 max-w-2xl mx-auto"
          >
            Peregrio tracks your Viator and GetYourGuide listings, monitors competitors,
            and tells you what to fix — before another operator takes your spot.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.35 }}>
            <button
              onClick={() => setShowWaitlist(true)}
              className="px-8 py-4 rounded-xl btn-gradient text-white text-base font-semibold transition-all shadow-md hover:shadow-lg"
            >
              Get early access
            </button>
            <p className="text-slate-400 text-sm mt-4">Join 47 operators already on the waitlist</p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ FEATURE TEASERS ═══════════ */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingUp,
                title: "Position tracking",
                desc: "See where you rank in search results daily, and how that changes over time.",
              },
              {
                icon: Star,
                title: "Review intelligence",
                desc: "Get alerted to new reviews instantly. Understand sentiment trends before they hurt your ranking.",
              },
              {
                icon: Users,
                title: "Competitor monitoring",
                desc: "Track what your top competitors are doing differently — pricing, photos, descriptions.",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="border border-slate-100 rounded-2xl p-8 bg-white hover:border-cyan-200 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-cyan-700" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="py-8 px-6 text-center text-slate-400 text-sm">
        © 2025 Peregrio. Built for tour operators on Viator & GetYourGuide.
      </footer>
    </main>
  );
}
