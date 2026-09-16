import Link from "next/link";
import { AriLogo } from "@/components/brand/ari-logo";
import { CheckCircleIcon } from "@/components/icons/landing-icons";
import { BRAND_DOMAIN, BRAND_TAGLINE } from "@/lib/brand";

type AuthBrandPanelProps = {
  mode: "sign-in" | "sign-up";
};

const FEATURES = [
  "Contacts, tasks, and calendar in one workspace",
  "AI voice campaigns with compliance built in",
  "Appointments and follow-ups synced automatically",
];

export function AuthBrandPanel({ mode }: AuthBrandPanelProps) {
  const isSignUp = mode === "sign-up";

  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#5c7a6a] via-[#6d8878] to-[#8fa68e] lg:flex lg:flex-col">
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-white/5 blur-2xl" />

      <header className="relative z-10 px-12 pt-12">
        <Link href="/" className="inline-flex flex-col gap-2">
          <span className="inline-flex rounded-2xl bg-white/95 px-3 py-2 shadow-card">
            <AriLogo height={40} />
          </span>
          <p className="max-w-[240px] text-[12px] font-medium leading-snug text-white/80">
            {BRAND_TAGLINE} · {BRAND_DOMAIN}
          </p>
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 items-center px-12 py-10">
        <div className="max-w-[440px]">
          <h1 className="font-serif text-[44px] font-semibold leading-[1.08] tracking-tight text-white">
            {BRAND_TAGLINE}
          </h1>
          <p className="mt-5 text-[17px] leading-[1.65] text-white/85">
            {isSignUp
              ? "Create your account and manage outreach, contacts, and follow-ups from one place."
              : "Sign in to your dashboard for contacts, campaigns, calendar, and AI voice tools."}
          </p>

          <div className="mt-10 rounded-[20px] border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
              Everything in one place
            </p>
            <ul className="mt-5 space-y-4">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-white/90" />
                  <span className="text-[15px] leading-snug text-white/90">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}
