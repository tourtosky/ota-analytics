"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | "success";

const platformOptions = [
  { value: "viator", label: "Viator" },
  { value: "gyg", label: "GetYourGuide" },
  { value: "both", label: "Both" },
];

const listingCountOptions = [
  { value: "1", label: "Just 1" },
  { value: "2-5", label: "2–5" },
  { value: "6-20", label: "6–20" },
  { value: "20+", label: "20+" },
];

const stepTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.2 },
};

export default function WaitlistModal({ open, onClose }: WaitlistModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [listingCount, setListingCount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep(1);
    setEmail("");
    setName("");
    setPlatform("");
    setListingCount("");
    setSubmitting(false);
    setError(null);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const canContinueStep1 = email.trim().length > 0 && name.trim().length > 0;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, platform, listingCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setSubmitting(false);
        return;
      }
      setStep("success");
      setSubmitting(false);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const StepDots = ({ current }: { current: 1 | 2 | 3 }) => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`h-1.5 w-1.5 rounded-full transition-colors ${
            n === current ? "bg-cyan-600" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl p-8"
          >
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" {...stepTransition}>
                  <StepDots current={1} />
                  <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Get early access</h2>
                  <p className="text-slate-500 text-sm mb-6">Be first to know when Peregrio launches. No spam, ever.</p>
                  <div className="space-y-3 mb-6">
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-50 transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-50 transition-all"
                    />
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!canContinueStep1}
                    className="w-full py-3 rounded-xl btn-gradient text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Continue →
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" {...stepTransition}>
                  <StepDots current={2} />
                  <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">Which platforms are you on?</h2>
                  <p className="text-slate-500 text-sm mb-6">Pick the one that matches your business.</p>
                  <div className="space-y-2 mb-6">
                    {platformOptions.map((opt) => {
                      const selected = platform === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setPlatform(opt.value)}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                            selected
                              ? "border-cyan-600 bg-cyan-50 text-slate-900"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <span className="font-medium">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!platform}
                    className="w-full py-3 rounded-xl btn-gradient text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Continue →
                  </button>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" {...stepTransition}>
                  <StepDots current={3} />
                  <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">How many listings do you have?</h2>
                  <p className="text-slate-500 text-sm mb-6">Helps us tailor early access.</p>
                  <div className="space-y-2 mb-6">
                    {listingCountOptions.map((opt) => {
                      const selected = listingCount === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setListingCount(opt.value)}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                            selected
                              ? "border-cyan-600 bg-cyan-50 text-slate-900"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <span className="font-medium">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={submit}
                    disabled={!listingCount || submitting}
                    className="w-full py-3 rounded-xl btn-gradient text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {submitting ? "Joining..." : "Join the waitlist"}
                  </button>
                  {error && <p className="mt-3 text-sm text-red-500 text-center">{error}</p>}
                </motion.div>
              )}

              {step === "success" && (
                <motion.div key="success" {...stepTransition} className="text-center">
                  <div className="flex justify-center mb-4">
                    <CheckCircle2 className="w-12 h-12 text-cyan-600" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-slate-900 mb-3">You&apos;re on the list!</h2>
                  <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                    We&apos;ll reach out as soon as Peregrio is ready. Early members get priority access and locked-in pricing.
                  </p>
                  <button
                    onClick={handleClose}
                    className="w-full py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:border-slate-300 transition-all"
                  >
                    Close
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
