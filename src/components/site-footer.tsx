import Link from "next/link";

const linkClass = "inline-flex min-h-11 items-center rounded-lg px-2 outline-none transition hover:text-blue-700 hover:underline focus-visible:ring-4 focus-visible:ring-blue-100";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white px-3 py-6 text-sm text-slate-500 sm:px-6 sm:py-7">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Footer" className="-mx-2 flex flex-wrap gap-1 sm:gap-2">
          <Link href="/privacy" className={linkClass}>Privacy</Link>
          <Link href="/terms" className={linkClass}>Terms</Link>
          <Link href="/support" className={linkClass}>Support</Link>
        </nav>
        <div className="sm:text-right">
          <a href="https://jakegenerates.com/" className="inline-flex min-h-11 items-center rounded-lg font-medium text-blue-700 outline-none hover:underline focus-visible:ring-4 focus-visible:ring-blue-100">Explore more tools at JakeGenerates →</a>
          <p>© {new Date().getFullYear()} JakeGenerates. Built for practical field work.</p>
        </div>
      </div>
    </footer>
  );
}
