"use client";

import { useState, useEffect, useRef } from "react";
import AnalyzeForm from "@/components/AnalyzeForm";
import RegisterModal from "@/components/RegisterModal";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

/* ─── Animated number ─── */
function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const dur = 1800;
    const tick = () => {
      const t = Math.min((Date.now() - start) / dur, 1);
      setCount(Math.floor((1 - Math.pow(1 - t, 3)) * end));
      if (t < 1) requestAnimationFrame(tick);
      else setCount(end);
    };
    requestAnimationFrame(tick);
  }, [end, inView]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─── FAQ ─── */
function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-6 text-left group">
        <span className="text-lg text-slate-900 font-medium pr-8 group-hover:text-cyan-700 transition-colors">{q}</span>
        <span className="text-slate-300 flex-shrink-0">{open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pb-6 text-slate-500 leading-relaxed -mt-2"
          >
            {a}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Comparison row ─── */
function CompareRow({ label, yours, median, winning }: { label: string; yours: string; median: string; winning: boolean }) {
  return (
    <div className="grid grid-cols-3 py-3 border-b border-slate-100 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`text-center font-mono font-bold ${winning ? "text-emerald-600" : "text-red-500"}`}>{yours}</span>
      <span className="text-center font-mono text-slate-400">{median}</span>
    </div>
  );
}

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -60]);
  const [showRegister, setShowRegister] = useState(false);

  return (
    <main className="bg-white text-slate-900 selection:bg-cyan-100 overflow-x-hidden">
      <RegisterModal open={showRegister} onClose={() => setShowRegister(false)} />

      {/* ═══════════ NAV ═══════════ */}
      <nav className="fixed top-0 w-full z-50 px-6">
        <div className="max-w-6xl mx-auto mt-4 px-6 h-14 flex items-center justify-between rounded-2xl bg-white/80 backdrop-blur-2xl border border-slate-200 shadow-sm">
          <span className="text-base font-bold tracking-tight">
            peregr<span className="text-cyan-700">io</span>
          </span>
          <div className="flex items-center gap-6 text-sm">
            <a href="#features" className="text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">Features</a>
            <a href="/pricing" className="text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">Pricing</a>
            <a href="#faq" className="text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">FAQ</a>
            <a href="/login" className="text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">Login</a>
            <a href="/pricing" className="px-4 py-1.5 rounded-lg btn-gradient text-white text-sm font-medium transition-all shadow-sm">
              Try Free
            </a>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO — split layout ═══════════ */}
      <section ref={heroRef} className="relative md:min-h-screen flex items-center overflow-hidden">
        {/* BG: soft radial tints */}
        <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-cyan-100/50 blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-100/40 blur-[120px]" />

        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative z-10 max-w-6xl mx-auto px-6 w-full pt-24 pb-16 md:pt-28 md:pb-20">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-16 items-center">
            {/* Left: Copy */}
            <div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="mb-5 md:mb-6">
                <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-700/80 font-medium">
                  <span className="w-6 h-px bg-cyan-700/30" />
                  Tour listing intelligence
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.1 }}
                className="text-[2.5rem] sm:text-[3.25rem] md:text-[4.5rem] leading-[1.05] font-display font-bold tracking-tight mb-6 md:mb-8 text-slate-900"
              >
                Stop guessing.
                <br />
                <span className="gradient-text">
                  Start outranking.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="text-base md:text-lg text-slate-500 leading-relaxed mb-8 md:mb-10 max-w-lg"
              >
                Paste your listing URL. In 30 seconds, see how you compare to
                the top 10 competitors — and exactly what to change.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.35 }}>
                <AnalyzeForm />
              </motion.div>
            </div>

            {/* Right: Live data card */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="hidden lg:block"
            >
              <div className="relative">
                {/* Shadow behind card */}
                <div className="absolute -inset-4 bg-gradient-to-br from-cyan-100/60 via-transparent to-violet-100/60 rounded-3xl blur-xl" />

                <div className="relative rounded-2xl border border-slate-200 bg-white p-8 space-y-6 shadow-xl shadow-slate-200/50">
                  {/* Score header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Your listing score</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-mono font-bold text-red-500">43</span>
                        <span className="text-slate-300 font-mono">/100</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">After optimization</p>
                      <div className="flex items-baseline gap-1 justify-end">
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1.5 }}
                          className="text-5xl font-mono font-bold text-emerald-500"
                        >87</motion.span>
                        <span className="text-slate-300 font-mono">/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Mini bars */}
                  <div className="space-y-3">
                    {[
                      { label: "Title", score: 35, color: "bg-red-500" },
                      { label: "Photos", score: 15, color: "bg-red-500" },
                      { label: "Pricing", score: 78, color: "bg-emerald-500" },
                      { label: "Reviews", score: 28, color: "bg-red-500" },
                    ].map((bar, i) => (
                      <div key={bar.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">{bar.label}</span>
                          <span className={`font-mono font-bold ${bar.score >= 60 ? "text-emerald-600" : "text-red-500"}`}>{bar.score}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full">
                          <motion.div
                            className={`h-full ${bar.color} rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: `${bar.score}%` }}
                            transition={{ duration: 1.2, delay: 0.8 + i * 0.15, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommendation peek */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2 }}
                    className="pt-4 border-t border-slate-100"
                  >
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Top recommendation</p>
                    <p className="text-sm text-slate-600">
                      <span className="text-red-500 font-semibold">Add 8+ photos</span> — you have 3, competitors average 9.5.
                      Tours with 8+ photos convert 3.2x more.
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ PROBLEM STATEMENT ═══════════ */}
      <section className="py-20 md:py-32 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-sm text-cyan-700/80 uppercase tracking-[0.2em] font-medium mb-4">The problem</p>
            <h2 className="text-3xl md:text-5xl font-display font-bold leading-tight tracking-tight text-slate-900">
              300,000+ tours listed online.<br />
              Yours is <span className="text-red-500">invisible</span>.
            </h2>
            <p className="mt-6 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              You&apos;re spending time and money on a listing you&apos;ve never benchmarked.
              Meanwhile, your competitors are ranking higher, getting more reviews,
              and stealing your bookings.
            </p>
          </motion.div>

          {/* Comparison table */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <div className="grid grid-cols-3 pb-3 border-b border-slate-200 text-xs uppercase tracking-wider">
              <span className="text-slate-400">Metric</span>
              <span className="text-center text-red-500/80">You</span>
              <span className="text-center text-slate-400">Top 10 Median</span>
            </div>
            <CompareRow label="Photos" yours="3" median="9.5" winning={false} />
            <CompareRow label="Reviews" yours="47" median="156" winning={false} />
            <CompareRow label="Rating" yours="4.3" median="4.6" winning={false} />
            <CompareRow label="Title keywords" yours="2 of 5" median="4 of 5" winning={false} />
            <CompareRow label="Description length" yours="120 words" median="380 words" winning={false} />
            <CompareRow label="Price vs median" yours="+22%" median="baseline" winning={false} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-8 text-slate-400 text-sm"
          >
            Real data from a listing audit. This could be yours.
          </motion.p>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="py-20 md:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <p className="text-sm text-cyan-700/80 uppercase tracking-[0.2em] font-medium mb-4">How it works</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
              30 seconds. Zero signup.
            </h2>
          </motion.div>

          <div className="space-y-0">
            {[
              {
                num: "01",
                title: "Paste your listing URL",
                desc: "We extract your listing and pull every detail — title, description, pricing, photos, reviews, everything.",
              },
              {
                num: "02",
                title: "We find your top 10 competitors",
                desc: "Same destination, same category. We pull their data too and calculate medians across every metric that matters.",
              },
              {
                num: "03",
                title: "AI generates your playbook",
                desc: "Our AI analyzes the gap between you and the top performers. You get a 0-100 score across 6 dimensions and prioritized, specific recommendations.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-8 py-10 border-b border-slate-100 group"
              >
                <span className="text-5xl font-mono font-bold text-slate-100 group-hover:text-cyan-100 transition-colors flex-shrink-0 w-20">
                  {step.num}
                </span>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-cyan-700 transition-colors">{step.title}</h3>
                  <p className="text-slate-500 leading-relaxed max-w-xl">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES — bento grid ═══════════ */}
      <section id="features" className="py-20 md:py-32 px-6 bg-slate-50 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-50 rounded-full blur-[150px]" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-sm text-violet-600/80 uppercase tracking-[0.2em] font-medium mb-4">What you get</p>
            <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-slate-900">
              Not another dashboard.<br />
              A <span className="gradient-text">competitive weapon</span>.
            </h2>
          </motion.div>

          {/* Bento grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large card — Score */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-8 group hover:shadow-lg hover:border-slate-300 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-8">
                <div className="flex-1">
                  <p className="text-xs text-cyan-700/80 uppercase tracking-wider font-medium mb-3">Listing Score</p>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">0-100 across 6 dimensions</h3>
                  <p className="text-slate-500 leading-relaxed">
                    Title quality, description depth, pricing competitiveness, review performance,
                    photo count, and listing completeness. Each weighted by its impact on bookings.
                  </p>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                  {[
                    { label: "Title", v: 35, c: "text-red-500" },
                    { label: "Price", v: 78, c: "text-emerald-600" },
                    { label: "Reviews", v: 28, c: "text-red-500" },
                  ].map((d) => (
                    <div key={d.label} className="w-20 rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                      <p className="text-xs text-slate-400 mb-1">{d.label}</p>
                      <p className={`text-2xl font-mono font-bold ${d.c}`}>{d.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Tall card — AI */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="lg:row-span-2 rounded-2xl border border-slate-200 bg-gradient-to-b from-violet-50/60 to-white p-8 hover:shadow-lg hover:border-slate-300 transition-all"
            >
              <p className="text-xs text-violet-600/80 uppercase tracking-wider font-medium mb-3">AI Engine</p>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Powered by AI</h3>
              <p className="text-slate-500 leading-relaxed mb-8">
                Not generic tips. AI reads your listing, your competitors&apos; reviews, and the gap data —
                then writes recommendations you can copy-paste into your listing today.
              </p>
              <div className="space-y-3">
                {[
                  "Title rewrites with missing keywords",
                  "Description structure from top performers",
                  "Photo count & content recommendations",
                  "Pricing strategy based on market position",
                  "Review response templates",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="w-1 h-1 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                    <span className="text-slate-600">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Competitor Intel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-slate-200 bg-gradient-to-br from-cyan-50/40 to-white p-8 hover:shadow-lg hover:border-slate-300 transition-all"
            >
              <p className="text-xs text-cyan-700/80 uppercase tracking-wider font-medium mb-3">Competitor Intel</p>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Side-by-side comparison</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                See every metric — rating, reviews, price, photos — for you vs.
                the top 5 competitors. Red highlights show where you&apos;re losing.
              </p>
            </motion.div>

            {/* Review Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50/40 to-white p-8 hover:shadow-lg hover:border-slate-300 transition-all"
            >
              <p className="text-xs text-emerald-600/80 uppercase tracking-wider font-medium mb-3">Review Mining</p>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Sentiment analysis</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                We mine competitor reviews to find what travelers love and hate.
                Their complaints are your opportunities.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════ SOCIAL PROOF ═══════════ */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { n: 300, s: "+", label: "Listings analyzed" },
              { n: 47, s: "", label: "Countries" },
              { n: 6, s: "", label: "Scoring dimensions" },
              { n: 30, s: "s", label: "Average analysis" },
            ].map((d, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="text-4xl font-mono font-bold gradient-text mb-1"><Counter end={d.n} suffix={d.s} /></div>
                <div className="text-slate-400 text-sm">{d.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section id="cta" className="py-20 md:py-32 px-6 relative bg-slate-50">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan-100/40 rounded-full blur-[150px]" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold tracking-tight mb-6 leading-tight text-slate-900">
            Your competitors already<br />
            know their <span className="gradient-text">weak spots</span>.
          </h2>
          <p className="text-lg text-slate-500 mb-12">
            Do you? Free analysis. No signup. No credit card.
          </p>
          <AnalyzeForm />
        </motion.div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section id="faq" className="py-20 md:py-32 px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-12">
            <h2 className="text-3xl font-display font-bold tracking-tight text-slate-900">Questions</h2>
          </motion.div>

          <FAQ q="Is this really free?" a="Yes. Your first analysis is completely free. No credit card, no signup, no tricks. We want you to see the value before anything else." />
          <FAQ q="How does Peregrio work?" a="We pull your listing data and the top 10 competitors in your destination and category. Our AI analyzes every gap and generates specific, actionable fixes." />
          <FAQ q="What do you analyze?" a="Six dimensions: title quality, description depth, pricing competitiveness, review performance, photo count, and listing completeness (inclusions, exclusions, itinerary, cancellation policy). Each scored 0-100." />
          <FAQ q="Do I need an account on the platform?" a="No. You just need the URL of your listing. That's it." />
          <FAQ q="How long does it take?" a="About 30 seconds. We fetch data, run the competitor comparison, and generate AI recommendations in real-time." />
          <FAQ q="Will you support other platforms?" a="GetYourGuide, Airbnb Experiences, and more are on the roadmap. We're expanding platform support continuously." />
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="py-12 px-6 border-t border-slate-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold tracking-tight text-slate-900">
              peregr<span className="text-cyan-700">io</span>
            </span>
            <span className="text-slate-400 text-sm">Listing intelligence for tour operators</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-400">
            <a href="/contact" className="hover:text-slate-900 transition-colors">Contact</a>
            <a href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="/blog" className="hover:text-slate-900 transition-colors">Blog</a>
            <a href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-slate-900 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
