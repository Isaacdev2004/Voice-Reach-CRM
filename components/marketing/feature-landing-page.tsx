import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { JsonLd } from "@/components/marketing/json-ld";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { Icon } from "@/components/ui/icon";
import { FOUNDING_100 } from "@/lib/marketing/founding";
import type { FeaturePageConfig } from "@/lib/seo/feature-pages";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/seo/schema";

const DASHBOARD_IMAGE = "/brand/ari-dashboard-hero.png";

type FeatureLandingPageProps = {
  page: FeaturePageConfig;
};

export function FeatureLandingPage({ page }: FeatureLandingPageProps) {
  const schema = [
    softwareApplicationSchema({
      name: page.title,
      description: page.description,
      url: page.path,
    }),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Features", path: "/features" },
      { name: page.h1, path: page.path },
    ]),
  ];

  return (
    <MarketingShell>
      <JsonLd data={schema} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Features", href: "/features" },
          { label: page.h1 },
        ]}
      />

      <section className="hero-gradient">
        <div className="landing-shell grid items-center gap-10 py-8 md:grid-cols-2 md:py-12 lg:gap-14">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
              {page.category}
            </p>
            <h1 className="font-serif text-[2rem] font-semibold leading-tight text-ink md:text-[2.5rem] lg:text-[2.75rem]">
              {page.h1}
            </h1>
            <p className="mt-4 text-[16px] leading-relaxed text-slate-text md:text-[17px]">{page.intro}</p>
            <div className="mt-7 flex flex-wrap gap-4">
              <StartFreeButton location={`feature-${page.slug}`} label="Start Your 14-Day Free Trial" showArrow />
              <Link
                href={page.relatedProductHref}
                className="inline-flex items-center rounded-full border border-outline-variant/25 px-5 py-3 text-[14px] font-semibold text-ink hover:border-rose-gold/40"
              >
                See {page.relatedProductLabel}
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-outline-variant/15 shadow-card">
            <Image
              src={DASHBOARD_IMAGE}
              alt={`${page.h1} — ARI CRM feature for real estate agents`}
              width={1200}
              height={900}
              className="h-auto w-full object-cover object-top"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {page.sections.map((section, index) => (
        <section key={section.h2} className={index % 2 === 0 ? "bg-cream py-10 md:py-14" : "bg-ivory py-10 md:py-14"}>
          <div className="landing-shell mx-auto max-w-[44rem]">
            <h2 className="font-serif text-[24px] font-semibold text-ink md:text-[28px]">{section.h2}</h2>
            <div className="mt-4 space-y-4">
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 48)} className="text-[16px] leading-relaxed text-slate-text">
                  {p}
                </p>
              ))}
            </div>
            {section.bullets ? (
              <ul className="mt-5 space-y-2">
                {section.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-[15px] text-slate-text">
                    <Icon name="check_circle" className="shrink-0 text-rose-gold-deep" />
                    {b}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ))}

      <section className="border-y border-outline-variant/10 bg-ivory py-10 md:py-12">
        <div className="landing-shell grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {page.highlights.map((h) => (
            <article key={h.title} className="rounded-xl border border-outline-variant/10 bg-cream p-5">
              <h3 className="font-serif text-[17px] font-semibold text-ink">{h.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-text">{h.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="hero-gradient py-12 text-center md:py-14">
        <div className="landing-shell mx-auto max-w-[36rem]">
          <h2 className="font-serif text-[26px] font-semibold text-ink md:text-[32px]">
            Try {page.h1.split(" ").slice(0, 3).join(" ")} in ARI
          </h2>
          <p className="mt-3 text-[16px] text-slate-text">
            Learn how{" "}
            <Link href={page.relatedProductHref} className="font-semibold text-rose-gold-deep hover:underline">
              {page.relatedProductLabel}
            </Link>{" "}
            works with a {FOUNDING_100.trialDays}-day free trial.
          </p>
          <div className="mt-6">
            <StartFreeButton location={`feature-${page.slug}-final`} label="Start Your 14-Day Free Trial" showArrow />
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
