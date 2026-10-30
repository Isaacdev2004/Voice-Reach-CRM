import { CampaignFlowchart } from "./campaign-flowchart";
import { publicAiLaunch } from "@/lib/billing/ai/launch";
import Image from "next/image";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { FeatureSymbol } from "@/components/marketing/feature-symbol";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import {
  WalkthroughProvider,
  WalkthroughButton,
} from "@/components/marketing/public-walkthrough";
import { JsonLd } from "@/components/marketing/json-ld";
import { FEATURE_DISPLAY_ORDER, FEATURE_PAGES } from "@/lib/seo/feature-pages";
import { SITE_OFFER } from "@/lib/marketing/site-offer";
import { breadcrumbSchema } from "@/lib/seo/schema";

const capabilities = [
  {
    title: "CRM & Contacts",
    icon: "contacts",
    slug: "lead-management",
    body: "Keep every conversation, note, and opportunity organized in one place.",
  },
  {
    title: "Campaign Automation",
    icon: "campaign",
    slug: "campaign-builder",
    body: "Create multi-channel follow-up sequences that run on your schedule.",
  },
  {
    title: "AI Assistant",
    icon: "ai",
    slug: "ai-assistant",
    body: "Draft messages, refine scripts, and plan your next step with Ask MyARI.",
  },
  {
    title: "Calendar & Tasks",
    icon: "calendar",
    slug: "calendar-and-tasks",
    body: "Manage appointments, tasks, and reminders alongside your contacts.",
  },
  {
    title: "Voice Studio",
    icon: "voice",
    slug: "voice-studio",
    body: "Write and record voicemail scripts. Review audio before assigning it to a campaign.",
  },
  {
    title: "Analytics",
    icon: "analytics",
    slug: "analytics",
    body: "Review recorded campaign activity and available provider delivery results.",
  },
];
const tools = [
  {
    title: "Property Finder",
    slug: "property-finder",
    image: "/brand/heroes/properties-listing.png",
    body: "Save buyer preferences and open tailored external Zillow searches.",
  },
  {
    title: "Mortgage Calculator",
    slug: "mortgage-calculator",
    image: "/brand/marketing/financing-desk.webp",
    body: "Explore payment estimates and compare financing scenarios with your clients.",
  },
  {
    title: "Notes & Strategy",
    slug: "notes-and-strategy",
    image: "/brand/heroes/notes-botanical-office.png",
    body: "Keep important details and your next steps connected to each relationship.",
  },
];
export function PublicProductExperience({ home = false }: { home?: boolean }) {
  return (
    <WalkthroughProvider>
      <MarketingShell>
        {!home && (
          <JsonLd
            data={breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Features", path: "/features" },
            ])}
          />
        )}
        <div className="premium-features">
          <section className="features-hero" aria-labelledby="features-title">
            <Image
              className="features-hero-photo"
              src="/brand/marketing/public-architectural-hero.webp"
              alt=""
              fill
              priority
              sizes="100vw"
            />
            <div className="features-hero-fade" />
            <div className="landing-shell features-hero-inner">
              <div className="features-hero-copy">
                {home && <p className="public-eyebrow">Built for real estate agents</p>}
                <h1 id="features-title">
                  {home ? <>More than a CRM.<br />A complete business partner.</> : "Everything you need to turn follow-up into opportunity."}
                </h1>
                <p className="features-hero-description">
                  One beautifully connected workspace to manage relationships,
                  automate outreach, and keep your real estate business moving.
                </p>
                <div className="public-actions">
                  <StartFreeButton
                    location="features-hero"
                    showArrow
                    className="public-trial-button"
                  />
                  {home && <WalkthroughButton />}
                  <a className="public-outline-button" href="#capabilities">
                    Explore Features
                  </a>
                </div>
              </div>
              <ul className="features-assurances">
                {[
                  ["layers", "All-in-one platform"],
                  ["ai", "AI-powered drafting"],
                  ["home", "Built for real estate agents"],
                  ["check", "Guided setup included"],
                ].map(([icon, text]) => (
                  <li key={text}>
                    <FeatureSymbol name={icon} />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </section>
          {home && publicAiLaunch() && (
            <section className="landing-shell reviews-referrals">
              <h2 className="font-serif text-2xl">
                MyARI now includes your AI real estate assistant.
              </h2>
              <p>
                Create campaign drafts, prepare messages, organize tasks,
                propose appointments and produce private branded document
                drafts—with your approval before consequential actions.
              </p>
              <Link href="/pricing">Explore AI-inclusive plans →</Link>
            </section>
          )}
          <section
            id="capabilities"
            className="features-core landing-shell"
            aria-labelledby="core-title"
          >
            <div className="public-section-intro">
              <p className="public-eyebrow">Core capabilities</p>
              <h2 id="core-title">A complete real estate workspace.</h2>
              <p>
                Powerful tools designed to help you save time, stay connected,
                and move business forward.
              </p>
            </div>
            {!home && (
              <nav
                className="public-pillar-links"
                aria-label="Explore MyARI by purpose"
              >
                <a href="#relationships">Relationships</a>
                <a href="#outreach">Outreach</a>
                <a href="#intelligence">Intelligence</a>
                <a href="#productivity">Productivity</a>
              </nav>
            )}
            <div className="features-core-grid">
              {capabilities.map((c) => (
                <Link
                  href={`/features/${c.slug}`}
                  key={c.slug}
                  id={
                    c.slug === "lead-management" ? "relationships" : undefined
                  }
                  className="features-capability"
                >
                  <span className="public-icon-disc">
                    <FeatureSymbol name={c.icon} />
                  </span>
                  <div>
                    <h3>{c.title}</h3>
                    <p>{c.body}</p>
                    <span className="public-text-link">
                      Learn more <span aria-hidden>→</span>
                    </span>
                  </div>
                  <span className="features-card-chevron" aria-hidden>
                    ›
                  </span>
                </Link>
              ))}
            </div>
          </section>
          <section
            className="public-dashboard-editorial landing-shell"
            aria-labelledby="dashboard-showcase-title"
          >
            <figure className="public-application-frame">
              <div className="public-application-title">
                <span aria-hidden="true">● ● ●</span>
                <span>MyARI · Your workspace</span>
              </div>
              <a
                href="/brand/product-captures/dashboard-editorial.webp"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View full-size MyARI Dashboard demonstration"
              >
                <Image
                  src="/brand/product-captures/dashboard-editorial.webp"
                  alt="Actual MyARI Dashboard showing contacts, campaigns, daily priorities and marketing insights with synthetic demonstration records"
                  width={2880}
                  height={2160}
                  sizes="(max-width:767px) 94vw, (max-width:1280px) 58vw, 770px"
                />
              </a>
              <figcaption>
                Actual MyARI Dashboard · Synthetic demonstration data.{" "}
                <span>View full-size capture ↗</span>
              </figcaption>
            </figure>
            <div className="features-editorial-copy">
              <p className="public-eyebrow">
                One beautifully connected workspace
              </p>
              <h2 id="dashboard-showcase-title">
                Your business. Beautifully connected.
              </h2>
              <p>
                Your contacts, campaigns, conversations, and daily
                priorities—working together in one beautifully organized
                workspace.
              </p>
              <ul className="public-checklist">
                <li>
                  <FeatureSymbol name="check" />
                  Keep every relationship organized.
                </li>
                <li>
                  <FeatureSymbol name="check" />
                  Automate thoughtful outreach.
                </li>
                <li>
                  <FeatureSymbol name="check" />
                  Stay focused on your next opportunity.
                </li>
              </ul>
              <Link href="/features" className="public-solid-button">
                Explore MyARI <span aria-hidden="true">→</span>
              </Link>
              {home && (
                <div className="public-editorial-watch">
                  <WalkthroughButton editorial />
                </div>
              )}
            </div>
          </section>
          <section
            id="outreach"
            className="features-followup"
            aria-labelledby="followup-title"
          >
            <div className="landing-shell features-split">
              {home ? <CampaignFlowchart /> : <figure className="features-contact-capture">
                <Image
                  src="/brand/product-captures/contacts.webp"
                  alt="MyARI Contacts table and selected contact details using synthetic demo records"
                  width={1440}
                  height={1086}
                  sizes="(max-width:767px) 94vw, 54vw"
                />
                <figcaption>
                  Actual Contacts workspace · Synthetic demo records
                </figcaption>
              </figure>}
              <div className="features-editorial-copy">
                <p className="public-eyebrow">Follow-up that works</p>
                <h2 id="followup-title">
                  Stay connected,
                  <br /> effortlessly.
                </h2>
                <p>
                  Bring SMS, email, and ringless voicemail into a thoughtful
                  sequence. Set the timing, review your messages, and keep the
                  relationship at the center.
                </p>
                <ul className="public-checklist">
                  {[
                    "Multi-channel campaign sequences",
                    "Reply detection with configured stopping rules",
                    "Lead reactivation workflows",
                    "AI drafts you can review and personalize",
                  ].map((t) => (
                    <li key={t}>
                      <FeatureSymbol name="check" />
                      {t}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/features/campaign-builder"
                  className="public-solid-button"
                >
                  Explore Campaign Features <span aria-hidden>→</span>
                </Link>
                <p className="public-fine-print">
                  Campaign automation begins on Growth. Sending requires
                  configured providers, available usage and appropriate consent.
                </p>
              </div>
            </div>
          </section>
          {!home && (
            <section
              id="intelligence"
              className="public-ai-editorial landing-shell"
            >
              <div className="features-editorial-copy">
                <p className="public-eyebrow">
                  Intelligence, with you in control
                </p>
                <h2>
                  A thoughtful starting point.
                  <br />A human final say.
                </h2>
                <p>
                  Turn a clear brief into an email, SMS or voice-script draft.
                  Ask MyARI helps you find the words; you review the details
                  before they become outreach.
                </p>
                <Link
                  href="/features/ai-assistant"
                  className="public-text-link"
                >
                  Explore AI assistance <span aria-hidden>→</span>
                </Link>
                <p className="public-fine-print">
                  Drafting requires a configured AI provider. Demo content does
                  not establish a client&apos;s interests or authorize a
                  message.
                </p>
              </div>
              <figure>
                <Image
                  src="/brand/product-captures/assistant.webp"
                  alt="Actual Ask MyARI email drafting interface with synthetic demonstration content"
                  width={576}
                  height={640}
                  sizes="(max-width:767px) 90vw, 38vw"
                />
                <figcaption>
                  Actual Ask MyARI interface · Synthetic demonstration
                </figcaption>
              </figure>
            </section>
          )}
          <section
            id="productivity"
            className="features-agent-tools landing-shell"
            aria-labelledby="agent-tools-title"
          >
            <div className="features-editorial-copy">
              {!home && <p className="public-eyebrow">Built for real estate agents</p>}
              <h2 id="agent-tools-title">
                {home ? "Everything you need to turn follow-up into opportunity." : <>More than a CRM.<br />A complete business partner.</>}
              </h2>
              <p>
                From planning a showing to preparing a client conversation, keep
                your tools and thinking connected.
              </p>
              <a
                className="public-solid-button"
                href={home ? "/features#product-tour" : "#product-tour"}
              >
                Explore the Workspace <span aria-hidden>→</span>
              </a>
            </div>
            <div className="features-tools-grid">
              {tools.map((t) => (
                <Link
                  key={t.slug}
                  href={`/features/${t.slug}`}
                  className="features-tool-card"
                >
                  <div className="features-tool-photo">
                    <Image
                      src={t.image}
                      alt=""
                      fill
                      sizes="(max-width:767px) 90vw, 22vw"
                    />
                  </div>
                  <div>
                    <h3>{t.title}</h3>
                    <p>{t.body}</p>
                    <span className="public-text-link">
                      Learn more <span aria-hidden>→</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
          {!home && (
            <section
              id="product-tour"
              className="features-product-tour landing-shell"
              aria-labelledby="product-tour-title"
            >
              <div className="public-section-intro">
                <p className="public-eyebrow">A closer look</p>
                <h2 id="product-tour-title">
                  Beautifully connected. Built for your day.
                </h2>
                <p>
                  Explore actual MyARI workspaces, captured with demonstration
                  data.
                </p>
              </div>
              <ProductShowcase />
            </section>
          )}
          {!home && (
            <section
              id="how-it-works"
              className="features-workflow landing-shell"
              aria-labelledby="workflow-title"
            >
              <div>
                <p className="public-eyebrow">How MyARI works</p>
                <h2 id="workflow-title">
                  A clearer path from first hello to next step.
                </h2>
              </div>
              <ol>
                {[
                  {
                    title: "Bring your relationships together",
                    body: "Import contacts by CSV or add them manually, then organize stages, preferences, and notes.",
                  },
                  {
                    title: "Make follow-up intentional",
                    body: "Choose a campaign, review the content and consent, and enroll the contacts you select.",
                  },
                  {
                    title: "Focus on the next conversation",
                    body: "Review recorded activity, available delivery results, and your tasks and appointments.",
                  },
                ].map((s, i) => (
                  <li key={s.title}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{s.title}</h3>
                      <p>{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {home && (
            <section
              className="public-home-questions landing-shell"
              id="faq"
              aria-labelledby="home-faq-title"
            >
              <div>
                <p className="public-eyebrow">A few helpful details</p>
                <h2 id="home-faq-title">Your next chapter starts simply.</h2>
              </div>
              <div>
                <details>
                  <summary>What does the trial include?</summary>
                  <p>
                    Start with a {SITE_OFFER.trialDays}-day free trial. No
                    credit card is required. Trial usage caps apply;{" "}
                    <Link href="/pricing">
                      compare plans, included features and messaging allowances
                    </Link>{" "}
                    before choosing.
                  </p>
                </details>
                <details>
                  <summary>Can I bring my existing contacts?</summary>
                  <p>
                    Import a CSV or add contacts manually.{" "}
                    {SITE_OFFER.whiteGlove.shortLine}.{" "}
                    {SITE_OFFER.whiteGlove.detail}
                  </p>
                </details>
                <details>
                  <summary>Which integrations are available?</summary>
                  <p>
                    Connect Google Calendar or Dotloop where configured. SMS,
                    email, ringless voicemail and AI features depend on provider
                    setup and plan access. Property Finder uses external search
                    links, not live MLS data.
                  </p>
                </details>
              </div>
            </section>
          )}
          <section className="features-directory landing-shell">
            <details>
              <summary>
                Explore every MyARI feature <span aria-hidden>+</span>
              </summary>
              <div>
                {FEATURE_DISPLAY_ORDER.map((slug) => (
                  <Link key={slug} href={FEATURE_PAGES[slug].path}>
                    {FEATURE_PAGES[slug].eyebrow}
                    <span aria-hidden>↗</span>
                  </Link>
                ))}
              </div>
            </details>
            <p>
              Connect Google Calendar or Dotloop from Settings when configured.
              Property Finder opens external search links; MyARI does not
              provide a live MLS feed.
            </p>
          </section>
          <section
            id="pricing"
            className="features-final-cta"
            aria-labelledby="features-cta-title"
          >
            <Image
              src="/brand/heroes/dashboard-interior.jpg"
              alt=""
              fill
              sizes="100vw"
            />
            <div className="features-cta-shade" />
            <div className="landing-shell">
              <p className="public-eyebrow">Ready to see what MyARI can do?</p>
              <h2 id="features-cta-title">
                Start your {SITE_OFFER.trialDays}-day trial today.
              </h2>
              <p>
                Experience a smarter, more beautiful way to manage your real
                estate business.
              </p>
              <div className="public-actions">
                <StartFreeButton
                  location="features-final"
                  showArrow
                  className="public-trial-button"
                />
                <Link className="public-outline-button" href="/pricing">
                  View Pricing
                </Link>
              </div>
              <ul className="features-assurances">
                <li>
                  <FeatureSymbol name="check" />
                  No credit card required
                </li>
                <li>
                  <FeatureSymbol name="check" />
                  Compare plan features
                </li>
                <li>
                  <FeatureSymbol name="check" />
                  Setup support included
                </li>
              </ul>
            </div>
          </section>
        </div>
      </MarketingShell>
    </WalkthroughProvider>
  );
}
