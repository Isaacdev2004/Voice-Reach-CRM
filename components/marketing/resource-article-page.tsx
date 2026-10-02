import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { JsonLd } from "@/components/marketing/json-ld";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { trialCtaLabel } from "@/lib/marketing/site-offer";
import { RESOURCE_EDITORIAL, type ResourceArticle } from "@/lib/seo/resource-articles";
import { articleSchema, breadcrumbSchema } from "@/lib/seo/schema";

type ResourceArticlePageProps = {
  article: ResourceArticle;
};

export function ResourceArticlePage({ article }: ResourceArticlePageProps) {
  const schema = [
    articleSchema({
      title: article.title,
      description: article.description,
      path: article.path,
      publishedAt: article.publishedAt,
      modifiedAt: article.updatedAt ?? article.publishedAt,
      authorName: article.author ?? RESOURCE_EDITORIAL.author,
    }),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Resources", path: "/resources" },
      { name: article.title, path: article.path },
    ]),
  ];

  return (
    <MarketingShell>
      <JsonLd data={schema} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Resources", href: "/resources" },
          { label: article.title },
        ]}
      />

      <article className="bg-cream pb-12 md:pb-16">
        <header className="landing-shell mx-auto max-w-[44rem] py-8 md:py-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
            {article.category}
          </p>
          <h1 className="mt-3 font-serif text-[2rem] font-semibold leading-tight text-ink md:text-[2.5rem] lg:text-[2.75rem]">
            {article.title}
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-text md:text-[17px]">
            {article.description}
          </p>
          <p className="mt-4 text-[14px] text-taupe">
            By {article.author ?? RESOURCE_EDITORIAL.author} ·{" "}
            {new Date(article.publishedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {article.updatedAt ? (
              <>
                {" "}
                · Updated{" "}
                {new Date(article.updatedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </>
            ) : null}{" "}
            · {article.readTimeMinutes} min read
          </p>
          <p className="mt-2 text-[13px] italic text-taupe">
            {article.editorialNote ?? RESOURCE_EDITORIAL.editorialNote}
          </p>
        </header>

        <div className="landing-shell mx-auto max-w-[44rem] space-y-10">
          {article.sections.map((section) => (
            <section key={section.h2 ?? section.h3 ?? section.paragraphs?.[0]?.slice(0, 40)}>
              {section.h2 ? (
                <h2 className="font-serif text-[24px] font-semibold text-ink md:text-[28px]">{section.h2}</h2>
              ) : null}
              {section.h3 ? (
                <h3 className="font-serif text-[20px] font-semibold text-ink md:text-[22px]">{section.h3}</h3>
              ) : null}
              {section.paragraphs?.length ? (
                <div className={`space-y-4 ${section.h2 || section.h3 ? "mt-4" : ""}`}>
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 48)} className="text-[16px] leading-relaxed text-slate-text md:text-[17px]">
                      {p}
                    </p>
                  ))}
                </div>
              ) : null}
              {section.bullets ? (
                <ul
                  className={`list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-slate-text ${section.h2 || section.h3 || section.paragraphs?.length ? "mt-4" : ""}`}
                >
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        {(article.citations ?? RESOURCE_EDITORIAL.defaultCitations).length ? (
          <aside className="landing-shell mx-auto mt-12 max-w-[44rem] rounded-2xl border border-outline-variant/15 bg-cream p-6 md:p-8">
            <h2 className="font-serif text-[20px] font-semibold text-ink">Sources &amp; further reading</h2>
            <ul className="mt-4 space-y-2 text-[15px] text-slate-text">
              {(article.citations ?? RESOURCE_EDITORIAL.defaultCitations).map((c) => (
                <li key={c.label}>
                  {c.href ? (
                    <a href={c.href} className="font-medium text-rose-gold-deep hover:underline" rel="noopener noreferrer">
                      {c.label}
                    </a>
                  ) : (
                    c.label
                  )}
                </li>
              ))}
            </ul>
          </aside>
        ) : null}

        <aside className="landing-shell mx-auto mt-12 max-w-[44rem] rounded-2xl border border-outline-variant/15 bg-ivory p-6 md:p-8">
          <h2 className="font-serif text-[20px] font-semibold text-ink">Related from ARI</h2>
          <ul className="mt-4 space-y-2">
            {article.productLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="font-medium text-rose-gold-deep hover:underline">
                  {link.anchor} →
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <div className="landing-shell mx-auto mt-10 max-w-[44rem] text-center">
          <StartFreeButton location={`article-${article.slug}`} label={trialCtaLabel()} showArrow />
        </div>
      </article>
    </MarketingShell>
  );
}
