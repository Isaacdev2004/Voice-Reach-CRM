"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useUser } from "@clerk/nextjs";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&h=560&fit=crop";

export function DashboardDeckHero() {
  const { user } = useUser();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.firstName?.trim() || "there";

  return (
    <section className="overflow-hidden rounded-[28px] border border-outline-variant/10 bg-ivory shadow-card">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-center gap-6 p-8 sm:p-10 lg:p-12">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-taupe">
              Home dashboard
            </p>
            <h1 className="mt-3 font-serif text-[32px] font-semibold leading-tight text-ink sm:text-[40px]">
              {greeting}, {firstName}
            </h1>
            <p className="mt-3 text-[16px] leading-relaxed text-slate-text">
              Let&apos;s make today exceptional.
            </p>
          </div>

          <Link
            href="/dashboard/calendar"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-sage px-6 py-3 text-[14px] font-medium text-ivory transition-opacity hover:opacity-90"
          >
            View agenda
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        </div>

        <div className="relative min-h-[200px] sm:min-h-[240px] lg:min-h-[280px]">
          <Image
            src={HERO_IMAGE}
            alt="Warm, bright interior"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 40vw"
            priority
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ivory/40 via-transparent to-transparent lg:from-ivory/60" />
        </div>
      </div>
    </section>
  );
}
