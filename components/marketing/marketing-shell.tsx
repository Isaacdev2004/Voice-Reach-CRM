import type { ReactNode } from "react";
import Link from "next/link";
import { AriLogo } from "@/components/brand/ari-logo";
import { PublicNavigation } from "./public-navigation";
import "./public-website.css";
import "./public-site-refinement.css";
import { PageViewTracker } from "@/components/marketing/page-view-tracker";
import { BRAND_DOMAIN, BRAND_NAME, BRAND_URL } from "@/lib/brand";
import {
  MARKETING_FOOTER_COMPANY,
  MARKETING_FOOTER_FEATURES,
  MARKETING_FOOTER_LEGAL,
  MARKETING_FOOTER_PRODUCT,
  MARKETING_FOOTER_RESOURCES,
} from "@/lib/seo/marketing-nav";

type MarketingShellProps = {
  children: ReactNode;
  contentClassName?: string;
  /** On homepage, show anchor links alongside product pages. */
  variant?: "home" | "default";
};

export function MarketingShell({ children, contentClassName="" }: MarketingShellProps) {
  return (
    <div className="public-site min-h-screen bg-cream text-ink">
      <PageViewTracker />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ivory focus:px-4 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-ink focus:shadow-card"
      >
        Skip to main content
      </a>
      <PublicNavigation />

      <main id="main-content" className={`public-main ${contentClassName}`}>
        {children}
      </main>

      <footer className="border-t border-outline-variant/15 bg-ivory py-10 md:py-12">
        <div className="landing-shell">
          <div className="grid grid-cols-2 gap-6 md:gap-8 lg:grid-cols-3 xl:grid-cols-5">
            <div className="col-span-2 lg:col-span-1">
              <AriLogo height={32} />
              <p className="mt-3 max-w-[16rem] text-[14px] leading-relaxed text-slate-text">
                {BRAND_NAME} CRM - automated lead follow-up for real estate
                agents.
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">
                Product
              </p>
              <nav className="mt-3 flex flex-col gap-2">
                {MARKETING_FOOTER_PRODUCT.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-[14px] text-slate-text hover:text-rose-gold-deep"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">
                Features
              </p>
              <nav className="mt-3 flex flex-col gap-2">
                {MARKETING_FOOTER_FEATURES.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-[14px] text-slate-text hover:text-rose-gold-deep"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">
                Resources
              </p>
              <nav className="mt-3 flex flex-col gap-2">
                {MARKETING_FOOTER_RESOURCES.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-[14px] text-slate-text hover:text-rose-gold-deep"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">
                Company
              </p>
              <nav className="mt-3 flex flex-col gap-2">
                {MARKETING_FOOTER_COMPANY.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-[14px] text-slate-text hover:text-rose-gold-deep"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-widest text-taupe">
                Legal
              </p>
              <nav className="mt-3 flex flex-col gap-2">
                {MARKETING_FOOTER_LEGAL.slice(0, 3).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-[14px] text-slate-text hover:text-rose-gold-deep"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-outline-variant/10 pt-6 text-[13px] text-taupe md:flex-row">
            <span>
              © {new Date().getFullYear()} {BRAND_NAME}
            </span>
            <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              {MARKETING_FOOTER_LEGAL.slice(3).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-rose-gold-deep"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <a href={BRAND_URL} className="hover:text-rose-gold-deep">
              {BRAND_DOMAIN}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
