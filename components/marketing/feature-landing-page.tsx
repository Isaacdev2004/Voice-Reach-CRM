import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "./breadcrumbs";
import { JsonLd } from "./json-ld";
import { MarketingShell } from "./marketing-shell";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { FeatureProductDemo } from "./feature-product-demo";
import { FEATURE_DEMOS } from "@/lib/marketing/feature-demos";
import { FEATURE_SHOWCASES } from "@/lib/marketing/feature-showcases";
import { PRODUCT_CAPTURES } from "@/lib/marketing/product-captures";
import { SITE_OFFER, trialSupportLine } from "@/lib/marketing/site-offer";
import { FEATURE_PAGES, type FeaturePageConfig } from "@/lib/seo/feature-pages";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/seo/schema";
import "./feature-product-studio.css";
export function FeatureLandingPage({page}:{page:FeaturePageConfig}) {
  const demo=FEATURE_DEMOS[page.slug], showcase=FEATURE_SHOWCASES[page.slug],image=PRODUCT_CAPTURES[showcase.capture];
  return <MarketingShell>
    <JsonLd data={[softwareApplicationSchema({name:page.title,description:page.description,url:page.path}),breadcrumbSchema([{name:"Home",path:"/"},{name:"Features",path:"/features"},{name:page.h1,path:page.path}])]}/>
    <div className={"feature-detail product-feature-page product-feature-"+demo.kind}>
      <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Features",href:"/features"},{label:page.eyebrow}]}/>
      <section className="product-feature-hero landing-shell">
        <div className="product-feature-copy">
          <p className="public-eyebrow">{showcase.pillar} / {page.eyebrow}</p>
          <h1>{page.h1}</h1>
          <p className="feature-lede">{demo.intro}</p>
          <div className="public-actions">
            <StartFreeButton location={"feature-"+page.slug} showArrow className="public-trial-button"/>
            <a className="public-text-link" href="#product-demo">{demo.cta} <span aria-hidden>↓</span></a>
          </div>
          <p className="product-demo-disclosure">Interactive illustration · Synthetic data · Nothing is sent or saved.</p>
        </div>
        <FeatureProductDemo demo={demo}/>
      </section>
      <section id="workspace" className="product-feature-story landing-shell" aria-labelledby="product-story-title">
        <div className="product-story-heading"><div><p className="public-eyebrow">See it in action</p><h2 id="product-story-title">{demo.title}</h2></div><p>{showcase.note??"Review the details and choose your next step. Available tools and integrations depend on your account and configuration."}</p></div>
        <ol className="product-journey">{demo.steps.map((label,i)=><li key={label}><span>0{i+1}</span><h3>{label}</h3><p>{demo.details[i]}</p></li>)}</ol>
      </section>
      <section className="product-feature-details landing-shell" aria-label={"More about "+page.eyebrow}>
        <div className="product-detail-copy">{demo.steps.map((label,i)=><details key={label}><summary>{label}: a closer look</summary><p>{demo.details[i]}</p><p>{showcase.steps[i]}</p>{i===2&&showcase.note&&<p>{showcase.note}</p>}</details>)}</div>
        <details className="product-capture-disclosure"><summary>View the existing MyARI interface</summary><figure><Image src={image.src} alt={image.alt} width={image.width} height={image.height} sizes="(max-width:767px) 90vw, 440px" style={{maxWidth:Math.min(440,image.width/2)}}/><figcaption>{showcase.caption} Synthetic demonstration records.<a href={image.src} target="_blank" rel="noopener noreferrer">Open original-resolution capture ↗</a></figcaption></figure></details>
      </section>
      <nav className="product-feature-related landing-shell" aria-label="Related MyARI features"><span>Connected to your workspace</span>{demo.related.map(slug=><Link key={slug} href={FEATURE_PAGES[slug].path}>{FEATURE_PAGES[slug].eyebrow} <span aria-hidden>→</span></Link>)}<Link href="/features">All features →</Link></nav>
      <section className="product-feature-final landing-shell"><div><h2>Make room for more meaningful work.</h2><p>{trialSupportLine()}</p></div><div className="public-actions"><StartFreeButton location={"feature-"+page.slug+"-final"} showArrow className="public-trial-button"/><Link href="/pricing" className="public-text-link">Compare plans →</Link></div><p className="product-feature-terms">{SITE_OFFER.trialDays}-day trial. No credit card required. Features and sending allowances vary by plan. {showcase.pillar==="Outreach"?SITE_OFFER.compliance.shortNote:""}</p></section>
    </div>
  </MarketingShell>;
}
