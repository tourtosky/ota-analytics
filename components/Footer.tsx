export default function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <span className="text-base font-bold tracking-tight text-slate-900">
              peregr<span className="text-cyan-700">io</span>
            </span>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              Growth intelligence for tour operators on Viator and GetYourGuide.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-900 mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Features</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Pricing</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Integrations</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Roadmap</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-900 mb-4">Resources</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="/blog" className="text-slate-500 hover:text-slate-900 transition-colors">Blog</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Guides</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Case studies</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Help center</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">API docs</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-900 mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">About</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Customers</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Careers</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Press</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Partners</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-900 mb-4">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="/privacy" className="text-slate-500 hover:text-slate-900 transition-colors">Privacy</a></li>
              <li><a href="/terms" className="text-slate-500 hover:text-slate-900 transition-colors">Terms</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Cookie policy</a></li>
              <li><a href="/contact" className="text-slate-500 hover:text-slate-900 transition-colors">Contact</a></li>
              <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Security</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2025 Peregrio. Built for tour operators on Viator &amp; GetYourGuide.</p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-slate-700 transition-colors">Twitter</a>
            <a href="#" className="hover:text-slate-700 transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-slate-700 transition-colors">YouTube</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
