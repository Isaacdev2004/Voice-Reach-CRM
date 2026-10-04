"use client";

import { useRef, useState } from "react";
import { trackMarketingEvent } from "@/lib/marketing/track";

const DEMO_VIDEO_URL = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL?.trim();
const LOCAL_DEMO_VIDEO = "/videos/ari-demo.mp4";

const DEMO_TRANSCRIPT = [
  "ARI helps real estate agents follow up after a lead is in the CRM.",
  "Import a contact from CSV or manual entry, enroll them in a campaign, and ARI sends SMS, email, or ringless voicemail on the schedule you configure.",
  "When a lead replies, you take over with full context on the contact record.",
  "White-glove setup is included on every plan to import your database and launch your first campaign.",
].join(" ");

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

function isExternalEmbed(url: string) {
  return (
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    url.includes("vimeo.com") ||
    url.includes("player.vimeo.com")
  );
}

function trackProgress(current: number, duration: number, fired: Set<number>) {
  if (!duration || !Number.isFinite(duration)) return;
  const pct = (current / duration) * 100;
  for (const milestone of [25, 50, 75, 100]) {
    if (pct >= milestone && !fired.has(milestone)) {
      fired.add(milestone);
      trackMarketingEvent(milestone === 100 ? "demo_video_complete" : "demo_video_progress", {
        location: "landing",
        percent: milestone,
      });
    }
  }
}

export function DemoVideo() {
  const [loadError, setLoadError] = useState(false);
  const progressFired = useRef(new Set<number>());
  const onPlay = () => trackMarketingEvent("demo_video_play", { location: "landing" });
  const externalUrl = DEMO_VIDEO_URL && isExternalEmbed(DEMO_VIDEO_URL) ? DEMO_VIDEO_URL : null;
  const directUrl =
    DEMO_VIDEO_URL && !isExternalEmbed(DEMO_VIDEO_URL) ? DEMO_VIDEO_URL : LOCAL_DEMO_VIDEO;

  return (
    <section id="demo" className="scroll-mt-24 bg-ivory py-10 md:py-12 lg:py-14">
      <div className="landing-shell">
        <div className="mx-auto max-w-[40rem] text-center lg:max-w-[44rem]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep md:text-[13px]">
            See ARI in action
          </p>
          <h2 className="mt-2 font-serif text-[32px] font-semibold text-ink md:text-[40px] lg:text-[44px]">
            Follow Up Automatically - Without Losing the Human Touch
          </h2>
          <p className="mt-2 text-[17px] leading-relaxed text-slate-text lg:text-[18px]">
            After a contact enters ARI and joins a campaign, automated follow-up runs on your
            schedule - you handle replies and high-intent conversations.
          </p>
        </div>

        <div className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-2xl border border-outline-variant/15 bg-ink shadow-card md:mt-8">
          {externalUrl ? (
            <div className="relative aspect-video w-full">
              <iframe
                title="ARI product demo"
                src={embedUrl(externalUrl)}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={onPlay}
              />
            </div>
          ) : loadError ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-ink px-6 text-center">
              <p className="font-serif text-[20px] font-semibold text-ivory">Video unavailable</p>
              <p className="max-w-md text-[14px] leading-relaxed text-ivory/75">
                The demo file could not be loaded. Ask your team for a YouTube link and we can set{" "}
                <code className="text-rose-gold">NEXT_PUBLIC_DEMO_VIDEO_URL</code> in Vercel.
              </p>
            </div>
          ) : (
            <div className="relative aspect-video w-full bg-black">
              <video
                className="h-full w-full object-contain"
                controls
                playsInline
                preload="metadata"
                poster="/brand/ari-dashboard-hero.png"
                onPlay={onPlay}
                onTimeUpdate={(e) =>
                  trackProgress(
                    e.currentTarget.currentTime,
                    e.currentTarget.duration,
                    progressFired.current,
                  )
                }
                onError={() => setLoadError(true)}
              >
                <source src={directUrl} type="video/mp4" />
                <track kind="captions" srcLang="en" label="English" default />
                Your browser does not support embedded video.
              </video>
            </div>
          )}
        </div>

        <details className="mx-auto mt-6 max-w-4xl rounded-xl border border-outline-variant/15 bg-cream px-5 py-4 text-left">
          <summary className="cursor-pointer text-[14px] font-semibold text-ink">
            Video transcript
          </summary>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-text">{DEMO_TRANSCRIPT}</p>
        </details>
      </div>
    </section>
  );
}
