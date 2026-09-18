import Link from "next/link";

/**
 * Placeholder proof section — replace with verified beta testimonials in Week 2 of launch.
 * Structure matches launch plan: name + brokerage + outcome.
 */
const PLACEHOLDER_SLOTS = [
  {
    quote:
      "We're onboarding Founding 100 agents now. Real testimonials and outcome metrics will publish here as beta results come in.",
    name: "Beta program",
    brokerage: "Founding Realtor cohort",
    metric: "Activation · reactivation · appointments",
  },
  {
    quote:
      "ARI is built for the agent who already paid for leads but can't follow up consistently. Early users are testing lead reactivation campaigns now.",
    name: "Launch preview",
    brokerage: "Private beta",
    metric: "Time-to-value tracking",
  },
  {
    quote:
      "Join the Founding 100 for white-glove setup — we import your database and turn on your first follow-up sequence.",
    name: "Your spot",
    brokerage: "Limited to 100 agents",
    metric: "14-day free trial",
  },
];

export function LandingTestimonials() {
  return (
    <section id="proof" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
            Proof
          </p>
          <h2 className="mt-3 font-serif text-[26px] font-semibold text-ink md:text-[34px]">
            Real agents. Real follow-up. Real results.
          </h2>
          <p className="mt-3 text-[14px] text-slate-text">
            Verified testimonials from the Founding 100 beta will appear here. Join now to be
            among the first case studies.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLACEHOLDER_SLOTS.map((t) => (
            <article
              key={t.name}
              className="flex flex-col rounded-2xl border border-dashed border-outline-variant/30 bg-ivory p-6"
            >
              <p className="flex-1 text-[14px] leading-relaxed text-slate-text italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 border-t border-outline-variant/15 pt-4">
                <p className="font-semibold text-ink">{t.name}</p>
                <p className="text-[13px] text-taupe">{t.brokerage}</p>
                <p className="mt-2 text-[12px] font-medium text-rose-gold-deep">{t.metric}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/sign-up"
            className="inline-flex rounded-full bg-rose-gold px-8 py-3 text-[14px] font-bold uppercase tracking-wide text-ivory shadow-card hover:opacity-95"
          >
            Join Founding 100
          </Link>
        </div>
      </div>
    </section>
  );
}
