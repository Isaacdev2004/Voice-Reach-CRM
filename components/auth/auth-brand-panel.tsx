import Image from "next/image";
import Link from "next/link";
import { AriLogo } from "@/components/brand/ari-logo";
import { Icon } from "@/components/ui/icon";
import { BRAND_DOMAIN } from "@/lib/brand";
import { SITE_OFFER } from "@/lib/marketing/site-offer";

type AuthBrandPanelProps = {
  mode: "sign-in" | "sign-up";
};

const DASHBOARD_IMAGE = "/brand/ari-dashboard-hero.png";

const FEATURES = [
  "Contacts, tasks, and calendar in one workspace",
  "SMS, email, and ringless voicemail follow-up with compliance-aware controls",
  "Appointments and follow-ups synced automatically",
];

export function AuthBrandPanel({ mode }: AuthBrandPanelProps) {
  const isSignUp = mode === "sign-up";

  return (
    <aside className="relative hidden min-h-screen overflow-hidden hero-gradient lg:flex lg:flex-col">
      <div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-rose-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-16 h-64 w-64 rounded-full bg-champagne/40 blur-3xl" />

      <header className="relative z-10 px-12 pt-12">
        <Link href="/" className="inline-flex flex-col gap-2">
          <AriLogo height={44} />
          <p className="max-w-[260px] text-[12px] font-medium leading-snug text-taupe">
            {SITE_OFFER.hero.eyebrow} · {BRAND_DOMAIN}
          </p>
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 flex-col justify-center gap-8 px-12 py-10">
        <div className="max-w-[440px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-gold-deep">
            {SITE_OFFER.hero.eyebrow}
          </p>
          <h1 className="mt-3 font-serif text-[38px] font-semibold leading-[1.08] tracking-tight text-ink">
            {SITE_OFFER.primaryPromise}
          </h1>
          <p className="mt-4 text-[16px] leading-[1.65] text-slate-text">
            {isSignUp
              ? "Organize your pipeline, automate follow-up, and know exactly who needs your attention next."
              : "Sign in to your dashboard for contacts, campaigns, calendar, and follow-up tools."}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-outline-variant/15 shadow-[0_24px_70px_rgba(26,20,16,0.14)]">
          <Image
            src={DASHBOARD_IMAGE}
            alt="ARI CRM dashboard showing contacts, tasks, and marketing pulse on desktop"
            width={1360}
            height={860}
            priority
            sizes="50vw"
            className="h-auto w-full object-cover object-top"
          />
        </div>

        <div className="rounded-[20px] border border-outline-variant/15 bg-ivory/85 p-5 backdrop-blur-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
            Everything in one place
          </p>
          <ul className="mt-4 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Icon name="check_circle" className="mt-0.5 shrink-0 text-[18px] text-rose-gold-deep" />
                <span className="text-[14px] leading-snug text-slate-text">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
