import Image from "next/image";

/** Design-ready testimonials — swap for verified Founding 100 quotes at launch. */
const TESTIMONIALS = [
  {
    quote:
      "ARI has transformed how I manage my leads. The automated follow-up is a game-changer, and I've seen a real lift in conversations and closed deals.",
    name: "Jennifer K.",
    role: "Top Producer",
    company: "Keller Williams",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80",
  },
  {
    quote:
      "The automated follow-up is a game-changer. I used to lose leads because I couldn't keep up — now ARI ensures no lead goes cold.",
    name: "Mark D.",
    role: "Lead Agent",
    company: "RE/MAX",
    avatar:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&h=200&q=80",
  },
  {
    quote:
      "Finally, a CRM that understands real estate agents. It's intuitive, powerful, and I'm already seeing tangible results in lead conversion.",
    name: "Sarah L.",
    role: "Independent Realtor",
    company: "Compass",
    avatar:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&h=200&q=80",
  },
];

export function LandingTestimonials() {
  return (
    <section id="proof" className="bg-ivory py-16 md:py-20 lg:py-24">
      <div className="landing-shell">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-gold-deep md:text-[12px]">
            What agents are saying
          </p>
          <h2 className="mt-3 font-serif text-[28px] font-semibold text-ink md:text-[36px] lg:text-[40px]">
            Real agents. Real results.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3 lg:gap-8">
          {TESTIMONIALS.map((t) => (
            <article
              key={t.name}
              className="flex flex-col rounded-2xl border border-outline-variant/10 bg-cream p-6 lg:p-7"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={t.avatar}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-ink">{t.name}</p>
                  <p className="text-[13px] text-taupe">
                    {t.role}, {t.company}
                  </p>
                </div>
              </div>
              <p className="mt-5 flex-1 font-serif text-[17px] leading-relaxed text-ink/90 lg:text-[18px]">
                &ldquo;{t.quote}&rdquo;
              </p>
              <p className="mt-5 text-[14px] tracking-wider text-rose-gold-deep" aria-label="5 stars">
                ★★★★★
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
