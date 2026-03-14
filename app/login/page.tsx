"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Fetch role and redirect accordingly
      const res = await fetch("/api/auth/me");
      const data = await res.json();

      if (data.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              tour<span className="text-cyan-700">boost</span>
            </span>
          </Link>
          <p className="text-sm text-slate-400 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-gradient text-white font-semibold rounded-xl py-3 text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-700/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          <Link href="/" className="text-cyan-700 hover:text-cyan-800 font-medium">
            &larr; Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
