"use client";

import { useState } from "react";
import { X, Lock, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { Plan } from "@/lib/plans";
import { PLAN_LABELS, PLAN_LIMITS } from "@/lib/plans";

const UPGRADE_FEATURES: Record<string, { title: string; features: string[] }> = {
  free: {
    title: "Upgrade to Growth",
    features: [
      "Up to 5 listings",
      "Weekly automated monitoring",
      "Full AI recommendations",
      "Competitor Radar — alerts on changes",
      "Position tracking in search results",
    ],
  },
  growth: {
    title: "Upgrade to Pro",
    features: [
      "Unlimited listings",
      "Daily monitoring",
      "Review Intelligence — AI sentiment analysis",
      "Seasonal repricing recommendations",
      "Listing health score history & trends",
      "Priority support (< 24h response)",
    ],
  },
};

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  plan: Plan;
}

export default function UpgradeModal({ open, onClose, plan }: UpgradeModalProps) {
  const [subscribing, setSubscribing] = useState(false);
  const upgrade = UPGRADE_FEATURES[plan] || UPGRADE_FEATURES.free;
  const limit = PLAN_LIMITS[plan];
  const limitText = limit === Infinity ? "" : `${limit} listing${limit === 1 ? "" : "s"}`;

  const targetPlan = plan === "free" ? "growth" : "pro";

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan, interval: "monthly" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setSubscribing(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-slate-900/10 overflow-hidden"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10">
              <X className="w-5 h-5" />
            </button>

            <div className="px-8 pt-8 pb-6">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-50 to-violet-50 border border-slate-200 flex items-center justify-center mb-5">
                <Lock className="w-6 h-6 text-cyan-700" />
              </div>

              {/* Heading */}
              <h2 className="text-xl font-display font-bold text-slate-900 mb-2">
                You&apos;ve reached your {PLAN_LABELS[plan]} limit
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                {PLAN_LABELS[plan]} plan includes {limitText}. Upgrade to unlock more listings, monitoring, and AI-powered insights.
              </p>

              {/* Features */}
              <div className="mt-6 space-y-3">
                {upgrade.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="px-8 pb-8 space-y-3">
              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                className="block w-full text-center py-3 btn-gradient text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-700/20 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {subscribing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting...</>
                ) : (
                  `Subscribe to ${targetPlan === "growth" ? "Growth" : "Pro"} →`
                )}
              </button>
              <Link
                href="/pricing"
                onClick={onClose}
                className="block w-full text-center py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Compare all plans
              </Link>
              <button
                onClick={onClose}
                className="block w-full text-center py-2.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
