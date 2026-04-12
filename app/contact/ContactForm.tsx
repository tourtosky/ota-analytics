"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <nav className="fixed top-0 w-full z-50 px-6">
        <div className="max-w-6xl mx-auto mt-4 px-6 h-14 flex items-center justify-between rounded-2xl bg-white/80 backdrop-blur-2xl border border-slate-200 shadow-sm">
          <Link href="/" className="text-base font-bold tracking-tight">
            peregr<span className="text-cyan-700">io</span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <a href="/#features" className="text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">Features</a>
            <a href="/pricing" className="text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">Pricing</a>
            <a href="/#faq" className="text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">FAQ</a>
            <a href="/login" className="text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">Login</a>
            <a href="/pricing" className="px-4 py-1.5 rounded-lg btn-gradient text-white text-sm font-medium transition-all shadow-sm">
              Try Free
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-6 pt-36 pb-24">
        <div className="mb-10">
          <h1 className="text-4xl font-display font-bold tracking-tight text-slate-900 mb-3">
            Get in touch
          </h1>
          <p className="text-slate-500">We typically respond within 24 hours.</p>
        </div>

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Message sent!</h3>
            <p className="text-sm text-slate-500">We&apos;ll get back to you shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help?"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all text-sm resize-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 btn-gradient text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-700/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              ) : (
                "Send Message"
              )}
            </button>
          </form>
        )}
      </div>

      <footer className="py-12 px-6 border-t border-slate-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-base font-bold tracking-tight text-slate-900">
              peregr<span className="text-cyan-700">io</span>
            </Link>
            <span className="text-slate-400 text-sm">Listing intelligence for tour operators</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-400">
            <Link href="/contact" className="hover:text-slate-900 transition-colors">Contact</Link>
            <Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
            <Link href="/blog" className="hover:text-slate-900 transition-colors">Blog</Link>
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
