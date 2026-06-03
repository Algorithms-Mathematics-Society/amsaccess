import Link from "next/link";
export function MarketingFooter() {
  return (
    <>
      <footer className="relative bg-ams-dark text-slate-400 overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.02] select-none overflow-hidden">
          <span className="text-[20rem] font-bold text-white whitespace-nowrap">AMS ACCESS</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12 md:gap-8 ams-footer-grid">
            <div className="col-span-2 md:col-span-2">
              <div className="mb-6">
                <img src="/AMS_ACCESS_DARK.png" alt="AMS Access" className="h-8 w-auto" />
              </div>
              <p className="text-sm leading-relaxed max-w-sm mb-8 text-slate-500">
                A serious evaluation is more than an answer file. It is the environment the candidate worked inside, the interruptions around the work, and the evidence a reviewer can trust.
              </p>
              <div className="flex items-center gap-2.5 text-xs font-medium uppercase tracking-widest text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.8)] animate-pulse" />
                All systems operational
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Product</h4>
              <ul className="space-y-4 text-sm">
                <li><Link href="/#product" className="hover:text-purple-400 transition-colors">Workspace</Link></li>
                <li><Link href="/controlled-round" className="hover:text-purple-400 transition-colors">Controlled round</Link></li>
                <li><Link href="/download" className="hover:text-purple-400 transition-colors">Download</Link></li>
                <li><Link href="/pricing" className="hover:text-purple-400 transition-colors">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Resources</h4>
              <ul className="space-y-4 text-sm">
                <li><Link href="/docs" className="hover:text-purple-400 transition-colors">Documentation</Link></li>
                <li><Link href="/docs/chess-plugin" className="hover:text-purple-400 transition-colors">Chess plugin</Link></li>
                <li><Link href="/changelog" className="hover:text-purple-400 transition-colors">Changelog</Link></li>
                <li><Link href="/contact" className="hover:text-purple-400 transition-colors">Security</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Connect</h4>
              <ul className="space-y-4 text-sm">
                <li><Link href="/contact" className="hover:text-purple-400 transition-colors">Contact sales</Link></li>
                <li><Link href="/contact" className="hover:text-purple-400 transition-colors">Support</Link></li>
                <li><Link href="/contact" className="hover:text-purple-400 transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} AMS Access. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/contact" className="hover:text-white transition-colors">Privacy policy</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Terms of service</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
