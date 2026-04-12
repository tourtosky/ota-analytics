import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Peregrio",
  description: "How Peregrio collects, uses, and protects your data.",
};

export default function PrivacyPage() {
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

      <div className="max-w-3xl mx-auto px-6 pt-36 pb-24">
        <header className="mb-12">
          <h1 className="text-4xl font-display font-bold tracking-tight text-slate-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-slate-500">Last updated: April 12, 2026</p>
        </header>

        <article className="prose prose-slate prose-lg max-w-none
          prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight
          prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
          prose-p:leading-relaxed prose-p:text-slate-600
          prose-a:text-cyan-700 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-slate-900
          prose-li:text-slate-600">

          <p>
            Peregrio (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the peregrio.com website and related services.
            This Privacy Policy explains what data we collect, how we use it, and your rights regarding that data.
          </p>

          <h2>What Data We Collect</h2>
          <p>When you use Peregrio, we may collect the following information:</p>
          <ul>
            <li><strong>Account information:</strong> Your email address, full name, and password when you create an account.</li>
            <li><strong>Listing data:</strong> Viator listing URLs and product codes you submit for analysis. This is publicly available data that we fetch from the Viator API.</li>
            <li><strong>Payment information:</strong> When you subscribe to a paid plan, payment is processed by Stripe. We store your Stripe customer ID but never see or store your credit card number.</li>
            <li><strong>Usage data:</strong> Basic analytics about how you use the service (pages visited, features used) to improve the product.</li>
          </ul>

          <h2>How We Use Your Data</h2>
          <p>We use your data solely to provide and improve the Peregrio service:</p>
          <ul>
            <li>To run listing analyses and generate recommendations.</li>
            <li>To manage your account and subscriptions.</li>
            <li>To send transactional emails (account confirmation, password resets, billing receipts).</li>
            <li>To respond to support requests.</li>
          </ul>

          <h2>What We Don&apos;t Do</h2>
          <ul>
            <li>We do <strong>not</strong> sell your data to third parties.</li>
            <li>We do <strong>not</strong> serve advertising or share data with advertisers.</li>
            <li>We do <strong>not</strong> use your data for purposes unrelated to providing the service.</li>
          </ul>

          <h2>Third-Party Services</h2>
          <p>We use the following third-party services to operate Peregrio:</p>
          <ul>
            <li><strong>Supabase:</strong> Authentication and database storage. Your account data is stored securely in Supabase-hosted PostgreSQL databases.</li>
            <li><strong>Stripe:</strong> Payment processing. Stripe handles all credit card information under their own PCI-compliant privacy policy.</li>
            <li><strong>Anthropic API:</strong> AI-powered analysis and recommendations. Listing data sent to the API is used only to generate your report and is not stored by Anthropic for training.</li>
          </ul>

          <h2>Data Retention and Deletion</h2>
          <p>
            We retain your account data and analysis history for as long as your account is active.
            You can request deletion of your account and all associated data at any time by contacting us
            at <a href="mailto:hello@peregrio.com">hello@peregrio.com</a>. We will process deletion requests
            within 30 days.
          </p>

          <h2>Cookies</h2>
          <p>
            Peregrio uses session cookies exclusively for authentication purposes. These cookies are necessary
            to keep you signed in and do not track your browsing activity across other websites.
            We do not use advertising cookies, analytics cookies, or any third-party tracking cookies.
          </p>

          <h2>Contact</h2>
          <p>
            If you have questions about this privacy policy or your data, contact us
            at <a href="mailto:hello@peregrio.com">hello@peregrio.com</a>.
          </p>
        </article>
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
