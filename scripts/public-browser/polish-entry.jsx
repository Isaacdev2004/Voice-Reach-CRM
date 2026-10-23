import React from "react";
import { createRoot } from "react-dom/client";
import Home from "../../app/page";
import Features from "../../app/features/page";
import Contact from "../../app/contact/page";
import Pricing from "../../app/pricing/page";
import { ResourceArticlePage } from "../../components/marketing/resource-article-page";
import { RESOURCE_ARTICLES } from "../../lib/seo/resource-articles";
import { FeatureLandingPage } from "../../components/marketing/feature-landing-page";
import { FEATURE_PAGES } from "../../lib/seo/feature-pages";
window.__submissions = [];
window.fetch = async (url, options = {}) => {
  window.__submissions.push({ url, body: options.body });
  return new Response(
    JSON.stringify(
      window.__failContact
        ? { success: false, error: "Please try again." }
        : { success: true, ok: true },
    ),
    {
      status: window.__failContact ? 503 : 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
const slug = location.pathname.split("/")[2];
const Page =
  location.pathname === "/"
    ? Home
    : location.pathname === "/contact"
      ? Contact
      : location.pathname === "/pricing"
        ? Pricing
        : Features;
createRoot(document.getElementById("root")).render(
  location.pathname.startsWith("/resources/") && RESOURCE_ARTICLES[slug] ? <ResourceArticlePage article={RESOURCE_ARTICLES[slug]}/> : slug && FEATURE_PAGES[slug] ? (
    <FeatureLandingPage page={FEATURE_PAGES[slug]} />
  ) : (
    <Page />
  ),
);
