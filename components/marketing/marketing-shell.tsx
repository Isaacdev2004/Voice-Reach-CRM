import type { ReactNode } from "react";
import Link from "next/link";
import { AriLogo } from "@/components/brand/ari-logo";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { BRAND_DOMAIN, BRAND_NAME, BRAND_URL } from "@/lib/brand";
import {
  MARKETING_FOOTER_COMPANY,
  MARKETING_FOOTER_FEATURES,
  MARKETING_FOOTER_LEGAL,
  MARKETING_FOOTER_PRODUCT,
  MARKETING_FOOTER_RESOURCES,
  MARKETING_NAV_LINKS,
} from "@/lib/seo/marketing-nav";

type MarketingShellProps = {
  children: ReactNode;
  /** On homepage, show anchor links alongside product pages. */
  variant?: "home" | "default";
};

export function MarketingShell({ children, variant = "default" }: MarketingShellProps) {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/15 bg-ivory/95 backdrop-blur-md">
        <nav className="landing-shell flex h-14 items-center justify-between gap-4 md:h-[4.25rem]">
          <Link href="/" className="shrink-0" aria-label={`${BRAND_NAME} home`}>
            <AriLogo height={48} />
          </Link>

          <div className="hidden items-center gap-5 xl:flex xl:gap-7">
            {MARKETING_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[14px] text-ink/70 hover:text-rose-gold-deep"
              >
                {link.label}
              </Link>
            ))}
            {variant === "home" ? (
              <>
                <a href="#how-it-works" className="text-[14px] text-ink/70 hover:text-rose-gold-deep">
                  How it works
                </a>
                <a href="#faq" className="text-[14px] text-ink/70 hover:text-rose-gold-deep">
                  FAQ
                </a>
              </>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-3 md:gap-4">
            <Link
              href="/sign-in"
              className="hidden text-[14px] font-medium text-ink/75 hover:text-ink sm:block"
            >
              Log in
            </Link>
            <StartFreeButton className="!px-5 !py-2.5 !text-[12px] md:!px-7 md:!py-3 md:!text-[14px]" />
          </div>
        </nav>
      </header>

      <main className="pt-14 md:pt-[4.25rem]">{children}</main>

      <footer className="border-t border-outline-variant/15 bg-ivory py-10 md:py-12">
        <div className="landing-shell">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="sm:col-span-2 lg:col-span-1">
              <AriLogo height={32} />
              <p className="mt-3 max-w-[16rem] text-[14px] leading-relaxed text-slate-text">
                {BRAND_NAME} CRM — automated lead follow-up for real estate agents.
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">Product</p>
              <nav className="mt-3 flex flex-col gap-2">
                {MARKETING_FOOTER_PRODUCT.map((link) => (
                  <Link key={link.href} href={link.href} className="text-[14px] text-slate-text hover:text-rose-gold-deep">
                    {link.label}
                  </Link>
                ))}
                <Link href="/realtor-lead-follow-up" className="text-[14px] text-slate-text hover:text-rose-gold-deep">
                  Realtor follow-up
                </Link>
              </nav>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">Features</p>
              <nav className="mt-3 flex flex-col gap-2">
                {MARKETING_FOOTER_FEATURES.map((link) => (
                  <Link key={link.href} href={link.href} className="text-[14px] text-slate-text hover:text-rose-gold-deep">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">Resources</p>
              <nav className="mt-3 flex flex-col gap-2">
                {MARKETING_FOOTER_RESOURCES.map((link) => (
                  <Link key={link.href} href={link.href} className="text-[14px] text-slate-text hover:text-rose-gold-deep">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">Company</p>
              <nav className="mt-3 flex flex-col gap-2">
                {MARKETING_FOOTER_COMPANY.map((link) => (
                  <Link key={link.href} href={link.href} className="text-[14px] text-slate-text hover:text-rose-gold-deep">
                    {link.label}
                  </Link>
                ))}
              </nav>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-widest text-taupe">Legal</p>
              <nav className="mt-3 flex flex-col gap-2">
                {MARKETING_FOOTER_LEGAL.slice(0, 3).map((link) => (
                  <Link key={link.href} href={link.href} className="text-[14px] text-slate-text hover:text-rose-gold-deep">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-outline-variant/10 pt-6 text-[13px] text-taupe md:flex-row">
            <span>© {new Date().getFullYear()} {BRAND_NAME}</span>
            <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              {MARKETING_FOOTER_LEGAL.slice(3).map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-rose-gold-deep">
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
