type FaqItem = { q: string; a: string };

type SeoFaqSectionProps = {
  items: FaqItem[];
  title?: string;
};

export function SeoFaqSection({ items, title = "Frequently asked questions" }: SeoFaqSectionProps) {
  return (
    <section className="bg-cream py-12 md:py-16">
      <div className="landing-shell mx-auto max-w-[44rem]">
        <h2 className="text-center font-serif text-[28px] font-semibold text-ink md:text-[36px]">
          {title}
        </h2>
        <dl className="mt-8 space-y-6 md:mt-10">
          {items.map((item) => (
            <div
              key={item.q}
              className="rounded-2xl border border-outline-variant/15 bg-ivory p-6 md:p-7"
            >
              <dt className="font-serif text-[18px] font-semibold text-ink md:text-[20px]">{item.q}</dt>
              <dd className="mt-3 text-[15px] leading-relaxed text-slate-text md:text-[16px]">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
