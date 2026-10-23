import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "./breadcrumbs";
import { JsonLd } from "./json-ld";
import { MarketingShell } from "./marketing-shell";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { FeatureSymbol } from "./feature-symbol";
import {
  FEATURE_SHOWCASES,
  PILLAR_RELATED,
} from "@/lib/marketing/feature-showcases";
import { PRODUCT_CAPTURES } from "@/lib/marketing/product-captures";
import { SITE_OFFER, trialSupportLine } from "@/lib/marketing/site-offer";
import {
  FEATURE_PAGES,
  type FeaturePageConfig,
  type FeaturePageSlug,
} from "@/lib/seo/feature-pages";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/seo/schema";

export function FeatureLandingPage({ page }: { page: FeaturePageConfig }) {
  const showcase = FEATURE_SHOWCASES[page.slug],
    image = PRODUCT_CAPTURES[showcase.capture];
  const portrait = image.height > image.width;
  const benefits = page.highlights.slice(0, 3).map((benefit, i) => (
    <article key={benefit.title}>
      <span className="feature-benefit-number">0{i + 1}</span>
      <h3>{benefit.title}</h3>
      <p>{benefit.body}</p>
    </article>
  ));
  const related = [
    ...new Set<FeaturePageSlug>([
      ...PILLAR_RELATED[showcase.pillar],
      "ai-assistant",
      "calendar-and-tasks",
    ]),
  ]
    .filter((slug) => slug !== page.slug)
    .slice(0, 3);
  return (
    <MarketingShell>
      <JsonLd
        data={[
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
        ]}
      />
      <div
        className={`feature-detail feature-pillar-${showcase.pillar.toLowerCase()}`}
      >
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Features", href: "/features" },
            { label: page.eyebrow },
          ]}
        />
        <section className="feature-editorial-hero landing-shell">
          <div>
            <p className="public-eyebrow">
              {showcase.pillar} / {page.eyebrow}
            </p>
            <h1>{page.h1}</h1>
            <p className="feature-lede">{page.intro}</p>
            <div className="public-actions">
              <StartFreeButton
                location={`feature-${page.slug}`}
                showArrow
                className="public-trial-button"
              />
              <a className="public-outline-button" href="#workspace">
                Explore the workspace <span aria-hidden>↓</span>
              </a>
            </div>
          </div>
          <div className="feature-editorial-photo">
            <Image
              src={showcase.photo}
              alt=""
              fill
              priority
              sizes="(max-width:767px) 92vw, 45vw"
            />
          </div>
        </section>
        <section id="workspace" className="feature-workspace landing-shell">
          <div className="feature-section-heading">
            <div>
              <p className="public-eyebrow">Inside MyARI</p>
              <h2>{page.eyebrow}, in focus.</h2>
            </div>
            <p>
              Implemented tools. Real interface.
              <br />
              Synthetic demonstration records.
            </p>
          </div>
          <div
            className={
              portrait
                ? "feature-workspace-grid"
                : "feature-workspace-landscape"
            }
          >
            <figure>
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(max-width:767px) 94vw, (max-width:1440px) 90vw, 1240px"
              />
              <figcaption>
                {showcase.caption}{" "}
                <span>Demonstration data · Not customer results</span>
                <a href={image.src} target="_blank" rel="noopener noreferrer">
                  View full-size capture ↗
                </a>
              </figcaption>
            </figure>
            {portrait ? (
              <aside className="feature-portrait-benefits">{benefits}</aside>
            ) : null}
          </div>
          {showcase.note ? (
            <p className="feature-capability-note">{showcase.note}</p>
          ) : null}
        </section>
        {!portrait && (
          <section
            className="feature-benefits landing-shell"
            aria-label="Key benefits"
          >
            {benefits}
          </section>
        )}
        <div className="feature-editorial-sections landing-shell">
          {page.sections.map((section, i) => (
            <section key={section.h2}>
              <div className="feature-section-index">
                <span>0{i + 1}</span>
                <p className="public-eyebrow">
                  {i === 0
                    ? "Designed around your day"
                    : "A thoughtful next step"}
                </p>
                <h2>{section.h2}</h2>
              </div>
              <div>
                {section.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
                {section.bullets ? (
                  <ul className="feature-checks">
                    {section.bullets.map((b) => (
                      <li key={b}>
                        <FeatureSymbol name="check" />
                        {b}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>
        <section className="feature-how-it-works landing-shell">
          <div>
            <p className="public-eyebrow">How it works</p>
            <h2>A clear path to your next step.</h2>
            {page.highlights[3] ? (
              <p>
                {page.highlights[3].title}: {page.highlights[3].body}
              </p>
            ) : null}
          </div>
          <ol>
            {showcase.steps.map((step, i) => (
              <li key={step}>
                <span>0{i + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="feature-related landing-shell">
          <div className="feature-section-heading">
            <h2>Better, together.</h2>
            <Link href="/features" className="public-text-link">
              Explore all features <span aria-hidden>→</span>
            </Link>
          </div>
          <div>
            {related.map((slug) => (
              <Link href={FEATURE_PAGES[slug].path} key={slug}>
                <p className="public-eyebrow">
                  {FEATURE_SHOWCASES[slug].pillar}
                </p>
                <h3>{FEATURE_PAGES[slug].eyebrow}</h3>
                <span className="public-text-link">
                  Take a closer look <span aria-hidden>→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className="feature-final-cta">
          <div className="landing-shell">
            <div>
              <p className="public-eyebrow">Made for your next chapter</p>
              <h2>Make room for more meaningful work.</h2>
              <p>{trialSupportLine()}</p>
            </div>
            <div className="public-actions">
              <StartFreeButton
                location={`feature-${page.slug}-final`}
                showArrow
                className="public-trial-button"
              />
              <Link href="/pricing" className="public-outline-button">
                Compare plans
              </Link>
            </div>
            <p className="feature-final-note">
              {SITE_OFFER.trialDays}-day trial. No credit card required.
              Features and sending allowances vary by plan.{" "}
              {showcase.pillar === "Outreach"
                ? SITE_OFFER.compliance.shortNote
                : ""}
            </p>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
