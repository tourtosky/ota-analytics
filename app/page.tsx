"use client";

import { useState, useEffect } from "react";
import WaitlistModal from "@/components/WaitlistModal";
import { motion } from "framer-motion";
import { TrendingDown, EyeOff, BarChart2 } from "lucide-react";

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
        <div className="max-w-6xl mx-auto mt-4 px-6 h-14 flex items-center justify-between rounded-2xl bg-white/98 border border-slate-200 shadow-sm">
          <span className="text-base font-bold tracking-tight">
            peregr<span className="text-cyan-700">io</span>
          </span>
          <div className="flex items-center gap-6 text-sm">
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

      {/* ═══════════ SECTION 1 — THE PROBLEM ═══════════ */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-center text-slate-900">
            You&apos;re flying blind while competitors pull ahead
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-16">
            {[
              {
                Icon: TrendingDown,
                color: "text-red-400",
                title: "Rankings drop with no warning",
                desc: "Viator changes the algorithm. Your listing falls. You find out weeks later when bookings dry up.",
              },
              {
                Icon: EyeOff,
                color: "text-slate-400",
                title: "Competitors are invisible",
                desc: "You know someone is outranking you. You have no idea what they're doing differently, or why it's working.",
              },
              {
                Icon: BarChart2,
                color: "text-amber-400",
                title: "Your own data tells you nothing",
                desc: "Viator shows you impressions and bookings. It doesn't tell you where you stand or what to do about it.",
              },
            ].map((card) => (
              <div key={card.title} className="bg-white border border-slate-100 rounded-2xl p-8">
                <card.Icon size={32} className={card.color} strokeWidth={1.75} />
                <h3 className="mt-5 text-lg font-bold text-slate-900">{card.title}</h3>
                <p className="mt-2 text-slate-500 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 2 — POSITION TRACKING ═══════════ */}
      <section className="py-24 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-700/80 font-medium mb-4">Position Tracking</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-slate-900 mb-5">
              See your rank move. Know why it moved.
            </h2>
            <p className="text-slate-500 leading-relaxed mb-6">
              Most operators check their Viator page manually — maybe once a week, maybe never.
              Peregrio tracks your search position every day across your key destination and category,
              so you catch drops before they become disasters.
            </p>
            <ul className="space-y-3">
              {[
                "Daily rank tracking across destination + category",
                "Instant alerts when your position drops more than 3 spots",
                "See exactly which competitors moved past you",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm">
            <svg viewBox="0 0 480 280" className="w-full">
              <defs>
                <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0891b2" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[
                { rank: 2, y: 30 },
                { rank: 5, y: 80 },
                { rank: 8, y: 130 },
                { rank: 11, y: 180 },
                { rank: 14, y: 230 },
              ].map((g) => (
                <g key={g.rank}>
                  <line x1="50" x2="460" y1={g.y} y2={g.y} stroke="#f1f5f9" strokeWidth="1" />
                  <text x="40" y={g.y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">#{g.rank}</text>
                </g>
              ))}

              {[
                { d: "Apr 1", x: 60 },
                { d: "Apr 10", x: 195 },
                { d: "Apr 20", x: 330 },
                { d: "Apr 30", x: 455 },
              ].map((t) => (
                <text key={t.d} x={t.x} y="255" textAnchor="middle" fontSize="11" fill="#94a3b8">{t.d}</text>
              ))}

              <line x1="290" x2="290" y1="20" y2="240" stroke="#f59e0b" strokeDasharray="4 3" strokeWidth="1.5" />
              <text x="290" y="14" textAnchor="middle" fontSize="10" fill="#f59e0b">Algorithm update</text>

              <path
                d="M 60 130 L 80 120 L 100 105 L 120 95 L 140 85 L 160 70 L 180 60 L 200 50 L 220 55 L 240 50 L 260 60 L 280 70 L 290 90 L 300 150 L 320 180 L 340 175 L 360 160 L 380 130 L 400 110 L 420 95 L 440 85 L 455 80 L 455 240 L 60 240 Z"
                fill="url(#posGrad)"
              />
              <path
                d="M 60 130 L 80 120 L 100 105 L 120 95 L 140 85 L 160 70 L 180 60 L 200 50 L 220 55 L 240 50 L 260 60 L 280 70 L 290 90 L 300 150 L 320 180 L 340 175 L 360 160 L 380 130 L 400 110 L 420 95 L 440 85 L 455 80"
                stroke="#0891b2"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <circle cx="320" cy="180" r="5" fill="#ef4444" />
              <circle cx="320" cy="180" r="9" fill="#ef4444" fillOpacity="0.15" />

              <rect x="335" y="162" width="118" height="26" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" />
              <text x="394" y="179" textAnchor="middle" fontSize="10" fill="#ef4444">⬇ Dropped to #11</text>
            </svg>
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 3 — REVIEW INTELLIGENCE ═══════════ */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm order-2 lg:order-1">
            <svg viewBox="0 0 480 280" className="w-full">
              <text x="-130" y="14" transform="rotate(-90)" fontSize="10" fill="#94a3b8">Reviews / week</text>

              <g transform="translate(280, 8)">
                <rect x="0" y="0" width="8" height="8" fill="#10b981" />
                <text x="13" y="8" fontSize="11" fill="#475569">Positive</text>
                <rect x="65" y="0" width="8" height="8" fill="#cbd5e1" />
                <text x="78" y="8" fontSize="11" fill="#475569">Neutral</text>
                <rect x="125" y="0" width="8" height="8" fill="#ef4444" />
                <text x="138" y="8" fontSize="11" fill="#475569">Negative</text>
              </g>

              {[
                { pos: 8, neu: 3, neg: 4 },
                { pos: 9, neu: 2, neg: 5 },
                { pos: 7, neu: 3, neg: 6 },
                { pos: 8, neu: 4, neg: 5 },
                { pos: 6, neu: 3, neg: 7 },
                { pos: 7, neu: 2, neg: 8 },
                { pos: 8, neu: 3, neg: 7 },
                { pos: 9, neu: 2, neg: 6 },
                { pos: 11, neu: 2, neg: 3 },
                { pos: 13, neu: 2, neg: 2 },
                { pos: 14, neu: 1, neg: 1 },
                { pos: 15, neu: 2, neg: 1 },
              ].map((w, i) => {
                const x = 30 + i * 36;
                const scale = 10;
                const negH = w.neg * scale;
                const neuH = w.neu * scale;
                const posH = w.pos * scale;
                const baseY = 240;
                const negY = baseY - negH;
                const neuY = negY - neuH;
                const posY = neuY - posH;
                return (
                  <g key={i}>
                    <rect x={x} y={negY} width="24" height={negH} fill="#ef4444" />
                    <rect x={x} y={neuY} width="24" height={neuH} fill="#cbd5e1" />
                    <rect x={x} y={posY} width="24" height={posH} fill="#10b981" />
                    <text x={x + 12} y="258" textAnchor="middle" fontSize="10" fill="#94a3b8">W{i + 1}</text>
                  </g>
                );
              })}

              <line x1="312" x2="312" y1="20" y2="240" stroke="#7c3aed" strokeDasharray="4 3" strokeWidth="1.5" />
              <text x="312" y="14" textAnchor="middle" fontSize="10" fill="#7c3aed">Peregrio alerts start</text>
            </svg>
          </div>

          <div className="order-1 lg:order-2">
            <p className="text-xs uppercase tracking-[0.2em] text-violet-600 font-medium mb-4">Review Intelligence</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-slate-900 mb-5">
              Know what travelers say before it costs you bookings.
            </h2>
            <p className="text-slate-500 leading-relaxed mb-6">
              Reviews drive ranking. A pattern of complaints — even minor ones — tanks your score over time.
              Peregrio monitors every new review, detects sentiment shifts, and alerts you before a bad patch
              becomes a trend.
            </p>
            <ul className="space-y-3">
              {[
                "Instant alert when a new 1- or 2-star review appears",
                "AI-generated response suggestions for negative reviews",
                "Sentiment trend: is your reputation improving or slipping?",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 4 — COMPETITOR MONITORING ═══════════ */}
      <section className="py-24 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-600 font-medium mb-4">Competitor Radar</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-slate-900 mb-5">
              Your top 10 competitors, tracked daily.
            </h2>
            <p className="text-slate-500 leading-relaxed mb-6">
              When a competitor drops their price, adds photos, or suddenly starts getting more reviews —
              you&apos;ll know. Peregrio monitors the operators ranking above you and surfaces exactly what changed.
            </p>
            <ul className="space-y-3">
              {[
                "Price changes detected within 24 hours",
                "Photo count and quality tracking",
                "Review velocity: who's getting reviews faster than you",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm">
            <svg viewBox="0 0 480 300" className="w-full">
              <g>
                <text x="20" y="22" fontSize="11" fill="#94a3b8">Operator</text>
                <text x="200" y="22" fontSize="11" fill="#94a3b8">Rank</text>
                <text x="260" y="22" fontSize="11" fill="#94a3b8">Price</text>
                <text x="320" y="22" fontSize="11" fill="#94a3b8">Reviews</text>
                <text x="410" y="22" fontSize="11" fill="#94a3b8">Change</text>
                <line x1="20" x2="460" y1="32" y2="32" stroke="#e2e8f0" strokeWidth="1" />
              </g>

              <g>
                <rect x="20" y="42" width="440" height="44" fill="#f0f9ff" rx="4" />
                <rect x="20" y="42" width="3" height="44" fill="#0891b2" />
                <text x="32" y="62" fontSize="12" fill="#0f172a" fontWeight="600">Your listing</text>
                <text x="32" y="78" fontSize="10" fill="#94a3b8">You</text>
                <text x="200" y="70" fontSize="13" fill="#0f172a">#7</text>
                <text x="260" y="70" fontSize="13" fill="#0f172a">$89</text>
                <text x="320" y="70" fontSize="12" fill="#0f172a">47 ★4.3</text>
                <text x="410" y="70" fontSize="12" fill="#94a3b8">–</text>
              </g>

              <g>
                <rect x="20" y="92" width="440" height="44" fill="white" rx="4" />
                <text x="32" y="118" fontSize="12" fill="#0f172a">Sunset Tours</text>
                <text x="200" y="118" fontSize="13" fill="#0f172a">#3</text>
                <text x="260" y="118" fontSize="13" fill="#0f172a">$79</text>
                <text x="320" y="118" fontSize="12" fill="#0f172a">203 ★4.8</text>
                <rect x="404" y="106" width="48" height="22" rx="4" fill="#dcfce7" />
                <text x="428" y="121" textAnchor="middle" fontSize="11" fill="#16a34a">↓ $8</text>
              </g>

              <g>
                <rect x="20" y="142" width="440" height="44" fill="#f8fafc" rx="4" />
                <text x="32" y="168" fontSize="12" fill="#0f172a">City Explorers</text>
                <text x="200" y="168" fontSize="13" fill="#0f172a">#4</text>
                <text x="260" y="168" fontSize="13" fill="#0f172a">$95</text>
                <text x="320" y="168" fontSize="12" fill="#0f172a">89 ★4.5</text>
                <text x="410" y="168" fontSize="12" fill="#94a3b8">–</text>
              </g>

              <g>
                <rect x="20" y="192" width="440" height="44" fill="white" rx="4" />
                <text x="32" y="218" fontSize="12" fill="#0f172a">Harbor Trips</text>
                <text x="200" y="218" fontSize="13" fill="#0f172a">#5</text>
                <text x="260" y="218" fontSize="13" fill="#0f172a">$82</text>
                <text x="320" y="218" fontSize="12" fill="#0f172a">156 ★4.7</text>
                <rect x="396" y="206" width="64" height="22" rx="4" fill="#fef3c7" />
                <text x="428" y="221" textAnchor="middle" fontSize="11" fill="#d97706">+4 photos</text>
              </g>

              <g>
                <rect x="20" y="242" width="440" height="44" fill="#f8fafc" rx="4" />
                <text x="32" y="268" fontSize="12" fill="#0f172a">AdventureX</text>
                <text x="200" y="268" fontSize="13" fill="#0f172a">#6</text>
                <text x="260" y="268" fontSize="13" fill="#0f172a">$74</text>
                <text x="320" y="268" fontSize="12" fill="#0f172a">312 ★4.9</text>
                <text x="410" y="268" fontSize="12" fill="#94a3b8">–</text>
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 5 — SOCIAL PROOF QUOTE ═══════════ */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-8xl text-cyan-100 font-serif leading-none select-none" aria-hidden>&ldquo;</div>
          <p className="text-xl text-slate-700 leading-relaxed italic -mt-4">
            I had no idea my photos were half the count of my top competitor.
            Fixed that in a week — bookings went up 23% the next month.
          </p>
          <p className="mt-6 text-sm text-slate-400">— Tour operator, Viator Suppliers community</p>

          <div className="mt-12">
            <p className="text-slate-600 mb-4">Want results like this?</p>
            <button
              onClick={() => setShowWaitlist(true)}
              className="px-8 py-4 rounded-xl btn-gradient text-white text-base font-semibold transition-all shadow-md hover:shadow-lg"
            >
              Join the waitlist
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 6 — FINAL CTA ═══════════ */}
      <section className="py-24 px-6 bg-gradient-to-br from-cyan-50 to-violet-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-slate-900 mb-5">
            Stop guessing. Start outranking.
          </h2>
          <p className="text-base md:text-lg text-slate-500 leading-relaxed mb-10 max-w-xl mx-auto">
            Peregrio is launching soon. Join the waitlist and get early access,
            priority onboarding, and locked-in pricing.
          </p>
          <button
            onClick={() => setShowWaitlist(true)}
            className="btn-gradient text-white px-10 py-4 rounded-xl text-base font-semibold shadow-md hover:shadow-lg transition-all"
          >
            Get early access →
          </button>
          <p className="text-slate-400 text-sm mt-3">No credit card. No commitment.</p>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="py-8 px-6 border-t border-slate-100 text-center text-slate-400 text-sm">
        © 2025 Peregrio. Built for tour operators on Viator &amp; GetYourGuide.
      </footer>
    </main>
  );
}
