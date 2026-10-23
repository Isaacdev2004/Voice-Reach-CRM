"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
const views = [
  {
    label: "Dashboard",
    image: "dashboard",
    title: "Your business, in one clear view.",
    body: "Review priorities, available campaign results, and the relationships that need your next step.",
    href: "/real-estate-crm",
  },
  {
    label: "Contacts",
    image: "contacts",
    title: "Every detail, beautifully organized.",
    body: "Filter your database, review contact details, and keep notes connected to each relationship.",
    href: "/features/lead-management",
  },
  {
    label: "Campaigns",
    image: "campaigns",
    title: "Thoughtful outreach, on autopilot.",
    body: "Build timed sequences across supported channels. Review content and enrollment before activation.",
    href: "/features/campaign-builder",
  },
  {
    label: "AI Assistant",
    image: "assistant",
    title: "A starting point that sounds like you.",
    body: "Use Ask MyARI to draft and refine copy. Provider configuration and usage limits apply; review every draft.",
    href: "/features/ai-assistant",
  },
  {
    label: "Calendar & Tasks",
    image: "calendar",
    title: "Make room for what matters.",
    body: "See your appointments and tasks together. Google Calendar connection is optional and requires setup.",
    href: "/features/calendar-and-tasks",
  },
  {
    label: "Voice Studio",
    image: "voice",
    title: "Your voice, beautifully prepared.",
    body: "Write, record, upload, or generate supported audio. Review recordings before campaign assignment.",
    href: "/features/voice-studio",
  },
  {
    label: "Reporting",
    image: "analytics",
    title: "Clarity from recorded activity.",
    body: "The reporting interface shown here summarizes available delivery events. Provider support determines which metrics are available.",
    href: "/features/analytics",
  },
];
export function ProductShowcase() {
  const [index, setIndex] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const view = views[index];
  return (
    <div className="product-showcase">
      <div
        role="tablist"
        aria-label="MyARI product workspaces"
        className="product-showcase-tabs"
      >
        {views.map((v, i) => (
          <button
            type="button"
            key={v.label}
            ref={(node) => {
              tabs.current[i] = node;
            }}
            role="tab"
            aria-selected={index === i}
            tabIndex={index === i ? 0 : -1}
            id={`showcase-tab-${i}`}
            aria-controls="showcase-panel"
            onClick={() => setIndex(i)}
            onKeyDown={(e) => {
              let next = i;
              if (e.key === "ArrowRight") next = (i + 1) % views.length;
              else if (e.key === "ArrowLeft")
                next = (i + views.length - 1) % views.length;
              else if (e.key === "Home") next = 0;
              else if (e.key === "End") next = views.length - 1;
              else return;
              e.preventDefault();
              setIndex(next);
              tabs.current[next]?.focus();
            }}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="showcase-panel"
        aria-labelledby={`showcase-tab-${index}`}
        tabIndex={0}
        className="product-showcase-panel"
      >
        <figure>
          <Image
            src={`/brand/product-captures/${view.image}.webp`}
            alt={`Actual MyARI ${view.image} workspace with synthetic demo records`}
            width={1440}
            height={1100}
            sizes="(max-width:767px) 92vw, 65vw"
          />
          <figcaption>
            Application capture · Demonstration data, not customer results
          </figcaption>
        </figure>
        <div>
          <p className="public-eyebrow">{view.label}</p>
          <h3>{view.title}</h3>
          <p>{view.body}</p>
          <Link href={view.href} className="public-text-link">
            Explore {view.label} <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
