import { Icon } from "@/components/ui/icon";

const FEATURES = [
  {
    icon: "real_estate_agent",
    title: "Built for producing agents",
    body: "Not part-time, hobby agents.",
  },
  {
    icon: "rocket_launch",
    title: "Get up and running fast",
    body: "White-glove setup included.",
  },
  {
    icon: "forum",
    title: "Automated follow-up",
    body: "via SMS, email, and ringless voicemail.",
  },
  {
    icon: "star",
    title: "Trusted by 1,000+ agents",
    body: "across the U.S.",
    stars: true,
  },
];

export function LandingFeaturesBar() {
  return (
    <section className="border-y border-outline-variant/10 bg-ivory py-8 md:py-10">
      <div className="landing-shell grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {FEATURES.map((item) => (
          <article key={item.title} className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-gold/15 text-rose-gold-deep">
              <Icon name={item.icon} className="text-[22px]" />
            </div>
            <div>
              <h3 className="font-serif text-[16px] font-semibold leading-snug text-ink lg:text-[17px]">
                {item.title}
              </h3>
              <p className="mt-1 text-[14px] leading-snug text-slate-text">{item.body}</p>
              {item.stars ? (
                <p className="mt-1.5 text-[13px] tracking-wider text-rose-gold-deep" aria-label="5 stars">
                  ★★★★★
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
