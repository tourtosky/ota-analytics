"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
  heading?: string;
  subheading?: string;
  onSuccess?: () => void;
}

export default function RegisterModal({ open, onClose, heading, subheading, onSuccess }: RegisterModalProps) {
  const [step, setStep] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("email");
        setEmail("");
        setError("");
        setResent(false);
        setLoading(false);
      }, 300);
    }
  }, [open]);

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      // Clear any existing session before starting OAuth
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!email.trim()) return;
    setError("");
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: typeof window !== "undefined" ? window.location.href : undefined,
        },
      });
      if (otpError) throw otpError;
      setStep("sent");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      setResent(true);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-slate-900/10 overflow-hidden"
          >
            {/* Close button */}
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10">
              <X className="w-5 h-5" />
            </button>

            {step === "email" ? (
              <div className="px-8 pt-8 pb-8 space-y-5">
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-900">
                    {heading || "Create your account"}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {subheading || "Get free access to listing analytics and AI insights"}
                  </p>
                </div>

                {/* Google OAuth */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition-all disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs text-slate-400">or continue with email</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                    placeholder="you@company.com"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
                  />

                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}

                  <button
                    onClick={handleContinue}
                    disabled={loading || !email.trim()}
                    className="w-full py-3 btn-gradient text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-700/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Please wait...</> : "Continue"}
                  </button>
                </div>

                <p className="text-center text-xs text-slate-400">
                  By continuing, you agree to our{" "}
                  <a href="/terms" className="text-cyan-700 hover:underline">Terms</a>
                  {" "}and{" "}
                  <a href="/privacy" className="text-cyan-700 hover:underline">Privacy Policy</a>.
                </p>
              </div>
            ) : (
              <div className="px-8 py-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-50 to-violet-50 border border-slate-200 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-7 h-7 text-cyan-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>

                <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Check your email</h3>
                <p className="text-sm text-slate-500 mb-1">
                  We sent a sign-in link to
                </p>
                <p className="text-sm font-medium text-slate-800 mb-6">{email}</p>
                <p className="text-xs text-slate-400 mb-6">
                  Click the link in the email to sign in. It expires in 1 hour.
                </p>

                <button
                  onClick={handleResend}
                  disabled={loading || resent}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  {resent ? "Email resent \u2713" : loading ? "Sending..." : "Resend email"}
                </button>

                <div className="mt-4">
                  <button
                    onClick={() => { setStep("email"); setResent(false); setError(""); }}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    \u2190 Back
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
