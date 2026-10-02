import Link from "next/link";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { Icon } from "@/components/ui/icon";

export function LandingReactivation() {
  return (
    <section id="reactivation" className="scroll-mt-24 bg-cream py-12 md:py-16 lg:py-20">
      <div className="landing-shell mx-auto max-w-[44rem] text-center lg:max-w-[52rem]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
          Lead reactivation
        </p>
        <h2 className="mt-3 font-serif text-[28px] font-semibold text-ink md:text-[36px] lg:text-[40px]">
          Work the leads you already paid for
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-slate-text md:text-[17px]">
          Most agent databases hold months of dormant contacts — people who inquired but never got
          consistent follow-up. ARI helps you segment and re-engage eligible prospects with
          consent-aware SMS, email, and voicemail sequences.
        </p>
        <ul className="mt-8 grid gap-4 text-left sm:grid-cols-3">
          {[
            { icon: "filter_list", title: "Segment first", body: "By source, date, or neighborhood — not a mass blast." },
            { icon: "campaign", title: "Multi-touch", body: "Structured reactivation campaigns across channels." },
            { icon: "phone_callback", title: "You call responders", body: "Replies surface for personal follow-up." },
          ].map((item) => (
            <li key={item.title} className="rounded-2xl border border-outline-variant/10 bg-ivory p-5">
              <Icon name={item.icon} className="text-[24px] text-rose-gold-deep" />
              <p className="mt-3 font-serif text-[17px] font-semibold text-ink">{item.title}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-slate-text">{item.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <StartFreeButton location="homepage-reactivation" showArrow />
          <Link href="/lead-reactivation" className="text-[15px] font-semibold text-rose-gold-deep hover:underline">
            See reactivation workflows →
          </Link>
        </div>
      </div>
    </section>
  );
}
