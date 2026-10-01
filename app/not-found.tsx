import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { StartFreeButton } from "@/components/landing/start-free-button";

export default function NotFound() {
  return (
    <MarketingShell>
      <section className="landing-shell flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">404</p>
        <h1 className="mt-3 font-serif text-[2rem] font-semibold text-ink md:text-[2.5rem]">
          Page not found
        </h1>
        <p className="mt-4 max-w-md text-[16px] text-slate-text">
          This page doesn&apos;t exist or may have moved. Try the links below or head back to the
          homepage.
        </p>
        <nav className="mt-8 flex flex-wrap justify-center gap-4 text-[14px] font-medium">
          <Link href="/" className="text-rose-gold-deep hover:underline">
            Home
          </Link>
          <Link href="/real-estate-crm" className="text-rose-gold-deep hover:underline">
            Real Estate CRM
          </Link>
          <Link href="/resources" className="text-rose-gold-deep hover:underline">
            Resources
          </Link>
          <Link href="/contact" className="text-rose-gold-deep hover:underline">
            Contact
          </Link>
        </nav>
        <div className="mt-8">
          <StartFreeButton location="404" label="Start Your 14-Day Free Trial" />
        </div>
      </section>
    </MarketingShell>
  );
}
