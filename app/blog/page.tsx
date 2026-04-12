import { getAllPosts } from "@/lib/blog";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — Peregrio",
  description: "Guides and insights for tour operators: Viator listing optimization, ranking tactics, competitor analysis, and more.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Nav — same pattern as landing page */}
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

      <div className="max-w-3xl mx-auto px-6 pt-36 pb-24">
        <div className="mb-14">
          <p className="text-sm text-cyan-700/80 uppercase tracking-[0.2em] font-medium mb-3">Peregrio Blog</p>
          <h1 className="text-4xl font-display font-bold tracking-tight text-slate-900 mb-4">
            Guides for tour operators
          </h1>
          <p className="text-lg text-slate-500">
            Ranking tactics, listing optimization, and competitor intelligence for Viator operators.
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="text-slate-400">No posts yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {posts.map((post) => (
              <article key={post.slug} className="py-10 group">
                <Link href={`/blog/${post.slug}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-medium text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full">
                      {post.category}
                    </span>
                    <span className="text-xs text-slate-400">{post.readingTime}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-slate-900 mb-3 group-hover:text-cyan-700 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-slate-500 leading-relaxed mb-4">{post.description}</p>
                  <span className="text-sm font-medium text-cyan-700 group-hover:underline">
                    Read article →
                  </span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
