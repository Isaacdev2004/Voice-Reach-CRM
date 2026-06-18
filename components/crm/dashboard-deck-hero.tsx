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
      <div className="grid min-h-[280px] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-taupe">
            Home dashboard
          </p>
          <h1 className="mt-3 font-serif text-[34px] font-semibold leading-[1.12] text-ink sm:text-[42px] lg:text-[46px]">
            {greeting}, {firstName}
          </h1>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-slate-text sm:text-[18px]">
            Let&apos;s make today exceptional.
          </p>
          <Link
            href="/dashboard/calendar"
            className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-sage px-6 py-3 text-[14px] font-medium text-ivory transition-opacity hover:opacity-90"
          >
            View agenda
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        </div>
        <div className="relative min-h-[220px] lg:min-h-full">
          <Image
            src={HERO_IMAGE}
            alt="Warm, bright interior"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 45vw"
            priority
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ivory/30 via-transparent to-transparent lg:from-ivory/50" />
        </div>
      </div>
    </section>
  );
}
