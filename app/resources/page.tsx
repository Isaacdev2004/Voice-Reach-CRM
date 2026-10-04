import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import {
  CORNERSTONE_ARTICLE_SLUGS,
  RESOURCE_ARTICLE_SLUGS,
  RESOURCE_ARTICLES,
  RESOURCE_EDITORIAL,
} from "@/lib/seo/resource-articles";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Real Estate Lead Follow-Up Resources",
  description:
    "Guides, scripts, and strategies for real estate lead follow-up, CRM selection, lead reactivation, and converting more opportunities into clients.",
  path: "/resources",
});

export default function ResourcesHubPage() {
  const cornerstone = CORNERSTONE_ARTICLE_SLUGS.map((slug) => RESOURCE_ARTICLES[slug]);
  const other = RESOURCE_ARTICLE_SLUGS.filter((s) => !CORNERSTONE_ARTICLE_SLUGS.includes(s)).map(
    (slug) => RESOURCE_ARTICLES[slug],
  );

  return (
    <MarketingShell>
      <section className="hero-gradient py-12 md:py-16">
        <div className="landing-shell mx-auto max-w-[44rem] text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
            Resources
          </p>
          <h1 className="mt-3 font-serif text-[2.25rem] font-semibold text-ink md:text-[2.75rem]">
            Real estate lead follow-up guides
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-text md:text-[17px]">
            Practical strategies for agents who want better follow-up, stronger pipelines, and more
            closed deals - from the team behind ARI CRM.
          </p>
        </div>
      </section>

      <section className="bg-cream py-10 md:py-14">
        <div className="landing-shell">
          <h2 className="font-serif text-[24px] font-semibold text-ink md:text-[28px]">
            Cornerstone guides
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {cornerstone.map((article) => (
              <Link
                key={article.slug}
                href={article.path}
                className="group rounded-2xl border border-rose-gold/20 bg-ivory p-6 hover:border-rose-gold/40"
              >
                <p className="text-[11px] font-bold uppercase tracking-widest text-rose-gold-deep">
                  {article.category}
                </p>
                <h3 className="mt-2 font-serif text-[18px] font-semibold text-ink group-hover:text-rose-gold-deep">
                  {article.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-text">{article.description}</p>
                <p className="mt-3 text-[13px] text-taupe">
                  {RESOURCE_EDITORIAL.author} ·{" "}
                  {new Date(article.publishedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  · {article.readTimeMinutes} min read
                </p>
              </Link>
            ))}
          </div>

          <h2 className="mt-12 font-serif text-[24px] font-semibold text-ink md:text-[28px]">
            More articles
          </h2>
          <ul className="mt-6 divide-y divide-outline-variant/15 rounded-2xl border border-outline-variant/15 bg-ivory">
            {other.map((article) => (
              <li key={article.slug}>
                <Link
                  href={article.path}
                  className="flex flex-col gap-1 px-6 py-5 transition-colors hover:bg-cream sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-taupe">
                      {article.category}
                    </p>
                    <h3 className="font-serif text-[17px] font-semibold text-ink">{article.title}</h3>
                  </div>
                  <span className="shrink-0 text-[13px] text-taupe">
                    {new Date(article.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {article.readTimeMinutes} min
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-10 text-center text-[15px] text-slate-text">
            Ready to put these strategies into action?{" "}
            <Link href="/lead-follow-up" className="font-semibold text-rose-gold-deep hover:underline">
              See how ARI automates real estate lead follow-up
            </Link>
            .
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
