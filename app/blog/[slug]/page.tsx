import { getAllPosts, getPostMeta } from "@/lib/blog";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import HowToRankHigher from "@/content/blog/how-to-rank-higher-on-viator.mdx";
import ListingOptimization from "@/content/blog/viator-listing-optimization-guide.mdx";

const mdxComponents: Record<string, React.ComponentType> = {
  "how-to-rank-higher-on-viator": HowToRankHigher,
  "viator-listing-optimization-guide": ListingOptimization,
};

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostMeta(slug);
  if (!post) return {};
  return {
    title: `${post.title} — Peregrio`,
    description: post.description,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostMeta(slug);
  if (!post) notFound();

  const MDXContent = mdxComponents[slug];
  if (!MDXContent) notFound();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
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
        {/* Back */}
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-10">
          ← All articles
        </Link>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs font-medium text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full">
              {post.category}
            </span>
            <span className="text-xs text-slate-400">{post.readingTime}</span>
            <span className="text-xs text-slate-400">
              {new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-slate-900 leading-tight mb-5">
            {post.title}
          </h1>
          <p className="text-xl text-slate-500 leading-relaxed">{post.description}</p>
        </header>

        {/* MDX content */}
        <article className="prose prose-slate prose-lg max-w-none
          prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight
          prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
          prose-p:leading-relaxed prose-p:text-slate-600
          prose-a:text-cyan-700 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-slate-900
          prose-li:text-slate-600
          prose-code:text-cyan-700 prose-code:bg-cyan-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
          prose-blockquote:border-cyan-300 prose-blockquote:text-slate-500 prose-blockquote:not-italic">
          <MDXContent />
        </article>

        {/* Footer CTA */}
        <div className="mt-20 rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
          <h3 className="text-xl font-display font-bold text-slate-900 mb-2">
            See how your listing compares
          </h3>
          <p className="text-slate-500 mb-6 text-sm">
            Get a free analysis — score, competitor benchmarks, and AI recommendations in under 30 seconds.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 btn-gradient text-white font-semibold rounded-xl text-sm shadow-lg shadow-cyan-700/20">
            Analyze My Listing Free →
          </Link>
        </div>
      </div>
    </main>
  );
}
