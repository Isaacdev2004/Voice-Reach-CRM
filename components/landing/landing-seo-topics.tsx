import Link from "next/link";

const TOPICS = [
  {
    h2: "Turn old leads into new opportunities",
    body: "Most agents sit on dormant contacts who inquired months ago. Lead reactivation campaigns re-engage them with SMS, email, and voicemail — no new ad spend required.",
    href: "/lead-reactivation",
    cta: "Lead reactivation software",
  },
  {
    h2: "Built for real estate agents who want to grow",
    body: "Whether you're a solo agent or building a team, ARI combines a real estate CRM with automated follow-up so your pipeline keeps moving toward closed deals.",
    href: "/real-estate-crm",
    cta: "Real estate CRM for agents",
  },
  {
    h2: "Never let another lead fall through the cracks",
    body: "Speed wins in real estate. When leads enter ARI, your follow-up sequence can begin on the schedule you configure — so you're the agent who stays in touch.",
    href: "/realtor-lead-follow-up",
    cta: "Realtor lead follow-up",
  },
] as const;

export function LandingSeoTopics() {
  return (
    <section className="bg-cream py-12 md:py-16 lg:py-20">
      <div className="landing-shell">
        <div className="grid gap-10 md:grid-cols-3 md:gap-8 lg:gap-10">
          {TOPICS.map((topic) => (
            <article key={topic.href}>
              <h2 className="font-serif text-[22px] font-semibold leading-snug text-ink md:text-[24px] lg:text-[26px]">
                {topic.h2}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-text md:text-[16px]">{topic.body}</p>
              <Link
                href={topic.href}
                className="mt-4 inline-flex text-[15px] font-semibold text-rose-gold-deep hover:underline"
              >
                {topic.cta} →
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-10 text-center text-[15px] text-slate-text">
          Also explore{" "}
          <Link href="/lead-follow-up" className="font-semibold text-rose-gold-deep hover:underline">
            lead follow-up system
          </Link>
          ,{" "}
          <Link href="/features/automated-follow-up" className="font-semibold text-rose-gold-deep hover:underline">
            product mechanics
          </Link>
          , our{" "}
          <Link href="/resources" className="font-semibold text-rose-gold-deep hover:underline">
            lead follow-up guides
          </Link>
          , and{" "}
          <Link href="/pricing" className="font-semibold text-rose-gold-deep hover:underline">
            ARI CRM pricing
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
