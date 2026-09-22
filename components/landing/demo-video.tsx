"use client";

import { trackMarketingEvent } from "@/lib/marketing/track";

const DEMO_VIDEO_URL = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL?.trim();

const DEMO_STEPS = [
  { step: "01", label: "Lead enters ARI" },
  { step: "02", label: "ARI sends follow-up" },
  { step: "03", label: "Lead responds" },
  { step: "04", label: "ARI updates status" },
  { step: "05", label: "Agent sees lead in dashboard" },
  { step: "06", label: "ARI identifies next action" },
];

function embedUrl(url: string) {
  if (url.includes("youtube.com/watch")) {
    const id = new URL(url).searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
  }
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split("?")[0];
    if (id) return `https://www.youtube.com/embed/${id}?rel=0`;
  }
  if (url.includes("vimeo.com/")) {
    const id = url.split("vimeo.com/")[1]?.split("?")[0];
    if (id) return `https://player.vimeo.com/video/${id}`;
  }
  return url;
}

export function DemoVideo() {
  const onPlay = () => trackMarketingEvent("demo_video_play", { location: "landing" });

  return (
    <section id="demo" className="scroll-mt-24 bg-ivory py-16 md:py-20 lg:py-24">
      <div className="landing-shell">
        <div className="mx-auto max-w-[40rem] text-center lg:max-w-[44rem]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep md:text-[12px]">
            See ARI in action
          </p>
          <h2 className="mt-3 font-serif text-[28px] font-semibold text-ink md:text-[36px] lg:text-[40px]">
            60–90 second demo
          </h2>
          <p className="mt-3 text-[16px] leading-relaxed text-slate-text lg:text-[17px]">
            From new lead to automated follow-up to your next call — the workflow agents use every
            day.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-outline-variant/15 bg-ink shadow-card">
          {DEMO_VIDEO_URL ? (
            <div className="relative aspect-video w-full">
              <iframe
                title="ARI product demo"
                src={embedUrl(DEMO_VIDEO_URL)}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={onPlay}
              />
            </div>
          ) : (
            <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
              {DEMO_STEPS.map((item, i) => (
                <div
                  key={item.step}
                  className={`flex items-center gap-3 border-outline-variant/10 p-5 ${
                    i < DEMO_STEPS.length - 1 ? "border-b sm:border-b-0 sm:border-r" : ""
                  }`}
                >
                  <span className="font-serif text-[22px] font-semibold text-rose-gold">{item.step}</span>
                  <p className="text-[14px] font-medium text-ivory">{item.label}</p>
                </div>
              ))}
              <div className="col-span-full border-t border-outline-variant/10 bg-rose-gold-deep px-6 py-4 text-center">
                <p className="font-serif text-[16px] font-semibold text-ivory">
                  Meet ARI. Your leads deserve better follow-up.
                </p>
                <p className="mt-1 text-[12px] text-ivory/70">
                  Video embed ready — set NEXT_PUBLIC_DEMO_VIDEO_URL in Vercel when your demo is
                  recorded.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
