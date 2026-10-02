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
        <div className="mt-8 space-y-3 md:mt-10">
          {items.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-outline-variant/15 bg-ivory open:shadow-sm"
            >
              <summary className="cursor-pointer list-none px-6 py-5 font-serif text-[18px] font-semibold text-ink marker:content-none md:text-[20px] [&::-webkit-details-marker]:hidden">
                {item.q}
              </summary>
              <div className="border-t border-outline-variant/10 px-6 pb-5 pt-3 text-[15px] leading-relaxed text-slate-text md:text-[16px]">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
