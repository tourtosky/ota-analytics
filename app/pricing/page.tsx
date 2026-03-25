"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import Link from "next/link";
import RegisterModal from "@/components/RegisterModal";

/* ─── FAQ (same component as landing) ─── */
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

/* ─── Coming Soon badge ─── */
function ComingSoon() {
  return (
    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-600 ring-1 ring-violet-200">
      Soon
    </span>
  );
}

/* ─── Feature row for comparison table ─── */
function FeatureRow({ label, free, growth, pro, comingSoon }: { label: string; free: boolean | string; growth: boolean | string; pro: boolean | string; comingSoon?: boolean }) {
  const renderCell = (val: boolean | string) => {
    if (typeof val === "string") return <span className="text-sm text-slate-600">{val}</span>;
    if (val) return <Check className="w-4 h-4 text-emerald-500 mx-auto" />;
    return <span className="block w-4 h-px bg-slate-200 mx-auto" />;
  };
  return (
    <div className="grid grid-cols-4 py-3 border-b border-slate-100 items-center text-sm">
      <span className="text-slate-600">
        {label}
        {comingSoon && <ComingSoon />}
      </span>
      <span className="text-center">{renderCell(free)}</span>
      <span className="text-center">{renderCell(growth)}</span>
      <span className="text-center">{renderCell(pro)}</span>
    </div>
  );
}

/* ─── Feature category header ─── */
function FeatureCategory({ label }: { label: string }) {
  return (
    <div className="grid grid-cols-4 py-3 border-b border-slate-200 mt-2">
      <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">{label}</span>
    </div>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleSubscribe = async (plan: "growth" | "pro") => {
    setLoadingPlan(plan);
    setCheckoutError(null);
    try {
      const authRes = await fetch("/api/auth/me");
      if (!authRes.ok) {
        setShowRegister(true);
        setLoadingPlan(null);
        return;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          interval: annual ? "yearly" : "monthly",
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Server error — please restart the dev server and try again.");
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to create checkout");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setCheckoutError("Something went wrong. Please try again.");
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      name: "Free",
      badge: "Get Started",
      badgeColor: "bg-slate-100 text-slate-600",
      description: "Perfect for trying TourBoost on your first listing",
      price: 0,
      priceAnnual: 0,
      period: "forever",
      features: [
        "1 listing analysis",
        "One-time audit report",
        "Overall score (0\u2013100)",
        "Basic competitor snapshot (top 3)",
        "AI recommendations preview (3 items)",
      ],
      cta: "Analyze My Listing \u2014 Free",
      ctaLink: "/#cta",
      ctaStyle: "border border-slate-200 text-slate-900 hover:border-slate-300 hover:shadow-md",
      highlighted: false,
    },
    {
      name: "Growth",
      badge: "Most Popular",
      badgeColor: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
      description: "For operators serious about ranking higher and booking more",
      price: 49,
      priceAnnual: 39,
      annualTotal: 468,
      period: "mo",
      features: [
        "Up to 5 listings",
        "Weekly automated monitoring",
        "Full competitor analysis (top 10)",
        "Complete AI recommendations",
        "Competitor Radar \u2014 alerts on price & photo changes",
        "Position tracking in search results",
        "Email alerts on significant changes",
        "CSV export",
      ],
      cta: "Start 7-Day Free Trial",
      ctaAction: "register",
      ctaStyle: "btn-gradient text-white shadow-lg shadow-cyan-700/20",
      highlighted: true,
    },
    {
      name: "Pro",
      badge: "For Serious Operators",
      badgeColor: "bg-violet-50 text-violet-600 ring-1 ring-violet-200",
      description: "Full intelligence suite for multi-listing operators and agencies",
      price: 129,
      priceAnnual: 99,
      annualTotal: 1188,
      period: "mo",
      features: [
        "Unlimited listings",
        "Daily monitoring",
        "Everything in Growth, plus:",
        "Review Intelligence \u2014 AI sentiment analysis",
        "Seasonal repricing recommendations",
        "Listing health score history & trends",
        { text: "GetYourGuide support", comingSoon: true },
        "Priority support (< 24h response)",
        { text: "API access", comingSoon: true },
      ],
      cta: "Start 7-Day Free Trial",
      ctaAction: "register",
      ctaStyle: "border border-slate-200 text-slate-900 hover:border-slate-300 hover:shadow-md",
      highlighted: false,
    },
  ];

  return (
    <main className="bg-white text-slate-900 selection:bg-cyan-100">
      <RegisterModal open={showRegister} onClose={() => setShowRegister(false)} />

      {/* ═══════════ NAV ═══════════ */}
      <nav className="fixed top-0 w-full z-50 px-6">
        <div className="max-w-6xl mx-auto mt-4 px-6 h-14 flex items-center justify-between rounded-2xl bg-white/80 backdrop-blur-2xl border border-slate-200 shadow-sm">
          <Link href="/" className="text-base font-bold tracking-tight">
            tour<span className="text-cyan-700">boost</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/#features" className="text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">Features</Link>
            <Link href="/pricing" className="text-cyan-700 font-medium hidden sm:block">Pricing</Link>
            <button onClick={() => setShowRegister(true)} className="px-4 py-1.5 rounded-lg btn-gradient text-white text-sm font-medium transition-all shadow-sm">
              Try Free
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative pt-36 pb-20 px-6 overflow-hidden">
        {/* BG effects */}
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-100/40 blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-15%] w-[500px] h-[500px] rounded-full bg-violet-100/30 blur-[120px]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-700/80 font-medium mb-6">
            <span className="w-6 h-px bg-cyan-700/30" />
            Pricing
            <span className="w-6 h-px bg-cyan-700/30" />
          </span>

          <h1 className="text-[3rem] md:text-[4rem] leading-[1.05] font-display font-bold tracking-tight mb-6 text-slate-900">
            Simple, transparent
            <br />
            <span className="gradient-text">pricing</span>.
          </h1>

          <p className="text-lg text-slate-500 leading-relaxed mb-10 max-w-xl mx-auto">
            Start free. Upgrade when you&apos;re ready to stay ahead of competitors.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 rounded-xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                !annual ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                annual ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Annual
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md ring-1 ring-emerald-200">
                Save 20%
              </span>
            </button>
          </div>

          {checkoutError && (
            <p className="mt-4 text-sm text-red-500 font-medium">{checkoutError}</p>
          )}
        </motion.div>
      </section>

      {/* ═══════════ PRICING CARDS ═══════════ */}
      <section className="px-6 pb-32">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {plans.map((plan, i) => {
              const price = annual ? plan.priceAnnual ?? plan.price : plan.price;
              const isHighlighted = plan.highlighted;

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 + i * 0.1 }}
                  className={`relative rounded-2xl p-[1px] ${
                    isHighlighted
                      ? "bg-gradient-to-b from-cyan-400 via-violet-400 to-cyan-400 bg-[length:100%_200%] animate-[gradient-shift_4s_ease_infinite] shadow-xl shadow-cyan-700/10 md:-mt-4 md:mb-[-16px]"
                      : ""
                  }`}
                >
                  <div className={`relative rounded-2xl p-8 h-full ${
                    isHighlighted
                      ? "bg-white"
                      : "bg-white border border-slate-200"
                  }`}>
                    {/* Badge */}
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium ${plan.badgeColor}`}>
                      {plan.badge}
                    </span>

                    {/* Price */}
                    <div className="mt-6 mb-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm text-slate-400 font-mono">$</span>
                        <motion.span
                          key={`${plan.name}-${annual}`}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="text-5xl font-mono font-bold text-slate-900"
                        >
                          {price}
                        </motion.span>
                        <span className="text-slate-400 text-sm ml-1">
                          / {plan.price === 0 ? plan.period : plan.period}
                        </span>
                      </div>
                      {annual && plan.annualTotal && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-slate-400 mt-1 font-mono"
                        >
                          billed ${plan.annualTotal}/yr
                        </motion.p>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-500 leading-relaxed mb-8">
                      {plan.description}
                    </p>

                    {/* CTA */}
                    {plan.ctaLink ? (
                      <Link
                        href={plan.ctaLink}
                        className={`block w-full text-center py-3.5 rounded-xl text-sm font-semibold transition-all ${plan.ctaStyle}`}
                      >
                        {plan.cta}
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(plan.name.toLowerCase() as "growth" | "pro")}
                        disabled={loadingPlan === plan.name.toLowerCase()}
                        className={`block w-full text-center py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${plan.ctaStyle}`}
                      >
                        {loadingPlan === plan.name.toLowerCase() ? "Redirecting..." : plan.cta}
                      </button>
                    )}

                    {/* Features */}
                    <div className="mt-8 pt-8 border-t border-slate-100 space-y-3.5">
                      {plan.features.map((feature, fi) => {
                        const text = typeof feature === "string" ? feature : feature.text;
                        const isComingSoon = typeof feature !== "string" && feature.comingSoon;
                        const isSubheader = text.startsWith("Everything in");

                        return (
                          <div key={fi} className="flex items-start gap-3">
                            {isSubheader ? (
                              <span className="text-xs text-cyan-700/80 font-medium uppercase tracking-wider pt-1">{text}</span>
                            ) : (
                              <>
                                <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isHighlighted ? "text-cyan-600" : "text-emerald-500"}`} />
                                <span className="text-sm text-slate-600">
                                  {text}
                                  {isComingSoon && <ComingSoon />}
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ COMPARISON TABLE ═══════════ */}
      <section className="py-32 px-6 bg-slate-50 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-50 rounded-full blur-[150px]" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm text-cyan-700/80 uppercase tracking-[0.2em] font-medium mb-4">Compare plans</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-slate-900">
              Everything at a glance
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm overflow-x-auto"
          >
            {/* Table header */}
            <div className="grid grid-cols-4 pb-4 border-b border-slate-200 min-w-[600px]">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Feature</span>
              <span className="text-center text-sm font-bold text-slate-900">Free</span>
              <span className="text-center text-sm font-bold text-cyan-700">Growth</span>
              <span className="text-center text-sm font-bold text-slate-900">Pro</span>
            </div>

            <div className="min-w-[600px]">
              {/* Analysis */}
              <FeatureCategory label="Analysis" />
              <FeatureRow label="Listings" free="1" growth="5" pro="Unlimited" />
              <FeatureRow label="Frequency" free="One-time" growth="Weekly" pro="Daily" />
              <FeatureRow label="Competitor depth" free="Top 3" growth="Top 10" pro="Top 10" />
              <FeatureRow label="Score breakdown (6 categories)" free={true} growth={true} pro={true} />
              <FeatureRow label="Full AI recommendations" free={false} growth={true} pro={true} />

              {/* Intelligence */}
              <FeatureCategory label="Intelligence" />
              <FeatureRow label="Competitor Radar" free={false} growth={true} pro={true} />
              <FeatureRow label="Position tracking" free={false} growth={true} pro={true} />
              <FeatureRow label="Review Intelligence" free={false} growth={false} pro={true} />
              <FeatureRow label="Seasonal repricing" free={false} growth={false} pro={true} />

              {/* Reporting */}
              <FeatureCategory label="Reporting" />
              <FeatureRow label="CSV export" free={false} growth={true} pro={true} />
              <FeatureRow label="History & trends" free={false} growth={false} pro={true} />
              <FeatureRow label="API access" free={false} growth={false} pro={true} comingSoon />

              {/* Support */}
              <FeatureCategory label="Support" />
              <FeatureRow label="Email support" free={true} growth={true} pro={true} />
              <FeatureRow label="Priority support (< 24h)" free={false} growth={false} pro={true} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="py-32 px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-12">
            <h2 className="text-3xl font-display font-bold tracking-tight text-slate-900">Questions</h2>
          </motion.div>

          <FAQ q="Is the free plan really free forever?" a="Yes. No credit card required. Analyze one listing and keep your report." />
          <FAQ q="What happens after the 7-day trial?" a="You'll be charged on day 8. Cancel anytime before that — no questions asked." />
          <FAQ q="Can I switch plans?" a="Yes, upgrade or downgrade anytime. Changes apply at next billing cycle." />
          <FAQ q="What counts as a 'listing'?" a="One listing = one Viator product URL. If you run 3 tours, that's 3 listings." />
          <FAQ q="Do you support GetYourGuide?" a="Coming soon! We're starting with Viator and expanding to GetYourGuide, Klook, and Civitatis." />
          <FAQ q="Is my data secure?" a="We only read public listing data from the official API. We never store your login credentials." />
        </div>
      </section>

      {/* ═══════════ BOTTOM CTA ═══════════ */}
      <section className="py-32 px-6 relative bg-slate-50">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan-100/40 rounded-full blur-[150px]" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-4 leading-tight text-slate-900">
            Not sure yet?
          </h2>
          <p className="text-lg text-slate-500 mb-10">
            Start with the free audit — no credit card needed.
          </p>
          <Link
            href="/#cta"
            className="inline-flex items-center gap-2 px-8 py-4 btn-gradient text-white font-semibold rounded-xl shadow-lg shadow-cyan-700/20 text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Analyze My Listing Free
          </Link>
        </motion.div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="py-12 px-6 border-t border-slate-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-base font-bold tracking-tight text-slate-900">
              tour<span className="text-cyan-700">boost</span>
            </Link>
            <span className="text-slate-400 text-sm">Listing intelligence for tour operators</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-400">
            <a href="mailto:hello@tourboost.app" className="hover:text-slate-900 transition-colors">Contact</a>
            <Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
            <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
