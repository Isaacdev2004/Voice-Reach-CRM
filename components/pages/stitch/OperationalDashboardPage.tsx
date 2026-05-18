"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const CARD =
  "rounded-[24px] border border-outline-variant/15 bg-surface-container-lowest shadow-card";

const TEAM_AVATARS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA7_iu1Gt72PsPhmecaWkZDKJ2hTDqnZTi1INIL1KC4Q1nIvMfAc08BJ44vLrjR1BsxDC_Vsi205v4regQcaE8kbrsDKdAXdo3myR67qJrABa5KGLWBqsCjHP9MFG0zYJ4cjkws7mdP8kBmX7Lk5PsIiEyNLQ8bu9fkyF9uApUPdVVerwVnLlhHzVTbHfL8cWwa3dQwE0mTaxCduDm03khDijYz6fQbz1KcQOI3d5BLXd9ceIaTwzbC5tJrrLVNKRpFHwzAEXyCBYEf",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCVZTJb8G8bvEssQrxjLkvWoHwvFesyzepY95avOubfpDGNaKAfqTMRzHJVX3gXn86slT_RYrV8I74dxZHe0ppvlpRZ-WE2y3Qu-JJP96846fGKxzKD-ssECOn8S3OH4empdX7a_Q46vb4u6bxKp2bcyMn2h6dJo3e2WrzMIFnwLfuv6XoqOy5PwdvPjCeDF5z4eWPHdF8Y8StyIWTztqofCyShBiwdYaIEmtXksL8HX6yF0V4l1_54GqObUPAkm9yqZ6JAHxg-f-_S",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAjZi6RDVurwILjrtzucdyO8Vi_0JF9CgFV-Rqa4O5aT4OgHb2oP8nj0BYXTiCEpipEd2yeCqsMNRle5cgqtsaARHY-COfMpxHjhh9ZrLxJIoTvb6XgsXGM3KrS77jAwrRNUjUtslX3QeeNDvWs42wahHJYeYCkZ3rI9sGtlRDum6hU8jgUV912_hL7bYRWRUOOWfzpHmyAT3J-I5VtNN-gc74uVwnKXNR8Seph56t6DUI5MvgTcjDKMLQwBAgqVoH0yOayVzhNkZ1K",
];

const DELIVERY_WEEKS = [
  { label: "Week 1", value: "12k", height: "h-[42%]" },
  { label: "Week 2", value: "18k", height: "h-[58%]" },
  { label: "Week 3", value: "15k", height: "h-[48%]" },
  { label: "Week 4", value: "22k", height: "h-[88%]" },
];

const ACTIVITIES = [
  {
    icon: "rocket_launch",
    iconClass: "bg-secondary-fixed text-on-secondary-fixed",
    title: "Summer Blast 2024 Launched",
    time: "2 mins ago",
    body: "Campaign targeting 25,000 new leads in California is now live.",
    highlight: false,
  },
  {
    icon: "gavel",
    iconClass: "bg-error-container text-error",
    title: "Compliance Alert: Re-consent Needed",
    time: "45 mins ago",
    body: 'TCPA requirements changed for Florida. Update scripts for campaign "Holiday Outreach".',
    highlight: true,
  },
  {
    icon: "bolt",
    iconClass: "bg-tertiary-fixed text-on-tertiary-fixed",
    title: "Automation: Lead Sync Complete",
    time: "2 hours ago",
    body: "Successfully synced 1,200 new contacts from Salesforce CRM integration.",
    highlight: false,
  },
  {
    icon: "file_upload",
    iconClass: "bg-surface-container-high text-primary",
    title: "Contact Batch Uploaded",
    time: "5 hours ago",
    body: 'Batch "Retail_Contacts_Q3" (5,000 items) processed successfully.',
    highlight: false,
  },
] as const;

const INTEGRATIONS = [
  { name: "Salesforce", status: "ACTIVE", tone: "success" as const },
  { name: "Twilio Voice API", status: "ACTIVE", tone: "success" as const },
  { name: "HubSpot Sync", status: "SYNCING", tone: "warning" as const },
];

type StatCardProps = {
  label: string;
  value: string;
  children?: ReactNode;
  variant?: "default" | "featured" | "alert";
};

function StatCard({ label, value, children, variant = "default" }: StatCardProps) {
  return (
    <div
      className={cn(
        CARD,
        "flex min-h-[148px] flex-col justify-between p-md",
        variant === "featured" && "border-transparent bg-primary-container text-on-primary shadow-nav",
        variant === "alert" && "border-error/20",
      )}
    >
      <div>
        <p
          className={cn(
            "font-label-md text-label-md",
            variant === "featured" ? "text-on-primary-container" : "text-on-surface-variant",
            variant === "alert" && "text-error",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "mt-2 font-headline-md text-headline-md tracking-tight",
            variant === "featured" ? "text-on-primary" : "text-primary",
            variant === "alert" && "text-error",
          )}
        >
          {value}
        </p>
      </div>
      {children}
    </div>
  );
}

function ActivityRow({
  icon,
  iconClass,
  title,
  time,
  body,
  highlight,
}: (typeof ACTIVITIES)[number]) {
  return (
    <div
      className={cn(
        "flex gap-4 p-md transition-colors hover:bg-surface-container-low/80",
        highlight && "bg-error/[0.04]",
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
          iconClass,
        )}
      >
        <Icon name={icon} className="text-[22px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className={cn("font-label-md text-label-md font-bold", highlight ? "text-error" : "text-primary")}>
            {title}
          </p>
          <span className={cn("shrink-0 font-caption text-caption", highlight ? "text-error" : "text-on-surface-variant")}>
            {time}
          </span>
        </div>
        <p className="mt-1 font-body-md text-body-md leading-relaxed text-on-surface-variant">{body}</p>
      </div>
    </div>
  );
}

export function OperationalDashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-lg p-8">
      {/* Page header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1 text-left">
          <h1 className="font-headline-lg text-headline-lg tracking-tight text-ink">
            Operational Dashboard
          </h1>
          <p className="mt-2 max-w-2xl font-body-lg text-body-lg leading-relaxed text-slate-text">
            Real-time performance metrics and automation health.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 md:pt-1">
          <Link
            href="/dashboard/contacts"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest px-6 font-label-md text-label-md font-bold text-primary transition-colors hover:bg-surface-container-low"
          >
            <Icon name="upload" className="text-[20px]" />
            Upload Contacts
          </Link>
          <Link
            href="/dashboard/campaigns"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-secondary px-6 font-label-md text-label-md font-bold text-on-secondary shadow-sm transition-opacity hover:opacity-90"
          >
            <Icon name="add" className="text-[20px]" />
            Create Campaign
          </Link>
        </div>
      </header>

      {/* KPI row */}
      <section className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Contacts" value="128,402">
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-tertiary-fixed px-2 py-0.5 font-caption text-[10px] font-bold uppercase tracking-wider text-on-tertiary-fixed">
              +12%
            </span>
            <span className="font-caption text-caption text-on-surface-variant">vs last month</span>
          </div>
        </StatCard>

        <StatCard label="Eligible Contacts" value="94,210">
          <div className="mt-4 space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-low">
              <div className="h-full w-[74%] rounded-full bg-secondary" />
            </div>
            <p className="font-caption text-caption text-on-surface-variant">74% audience match</p>
          </div>
        </StatCard>

        <StatCard label="Active Campaigns" value="12" variant="featured">
          <div className="mt-4 flex items-center">
            <div className="flex -space-x-2.5">
              {TEAM_AVATARS.map((src, i) => (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full border-2 border-primary-container object-cover"
                  unoptimized
                />
              ))}
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary-container bg-secondary font-caption text-[10px] font-bold text-on-secondary">
                +9
              </span>
            </div>
          </div>
        </StatCard>

        <StatCard label="Delivered" value="45.2k">
          <div className="mt-4 flex items-center gap-1.5 text-on-tertiary-container">
            <Icon name="trending_up" className="text-[18px]" />
            <span className="font-caption text-caption font-bold">89% success rate</span>
          </div>
        </StatCard>

        <StatCard label="Compliance Alerts" value="3" variant="alert">
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-error-container/30 px-3 py-2 text-error">
            <Icon name="warning" className="text-[18px]" />
            <span className="font-caption text-caption font-bold">Action required</span>
          </div>
        </StatCard>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        <div className={cn(CARD, "lg:col-span-2 p-lg")}>
          <div className="mb-md flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-headline-md text-headline-md text-primary">Delivery Trends</h2>
            <select
              defaultValue="30"
              className="h-10 cursor-pointer rounded-full border-0 bg-surface-container-low px-4 font-label-md text-label-md text-on-surface outline-none ring-secondary/20 focus:ring-2"
              aria-label="Delivery trends period"
            >
              <option value="30">Last 30 days</option>
              <option value="7">Last 7 days</option>
            </select>
          </div>

          <div className="flex h-[280px] items-end justify-between gap-3 border-b border-outline-variant/20 px-2 pb-2 pt-6">
            {DELIVERY_WEEKS.map((week) => (
              <div
                key={week.label}
                className="group flex flex-1 flex-col items-center gap-3"
              >
                <span className="rounded-md bg-ink px-2 py-1 font-caption text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {week.value}
                </span>
                <div
                  className={cn(
                    "w-full max-w-[72px] rounded-t-2xl bg-secondary/25 transition-colors group-hover:bg-secondary/50",
                    week.height,
                  )}
                />
                <span className="font-caption text-caption text-on-surface-variant">{week.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={cn(CARD, "flex flex-col p-lg")}>
          <h2 className="font-headline-md text-headline-md text-primary">Consent Rates</h2>
          <div className="mt-md flex flex-1 flex-col items-center justify-center">
            <div className="relative h-44 w-44">
              <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
                <circle
                  cx="100"
                  cy="100"
                  r="78"
                  fill="transparent"
                  stroke="var(--color-surface-container-low)"
                  strokeWidth="18"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="78"
                  fill="transparent"
                  stroke="var(--color-secondary)"
                  strokeWidth="18"
                  strokeDasharray="490"
                  strokeDashoffset="122"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-headline-lg text-[40px] leading-none tracking-tight text-primary">75%</span>
                <span className="mt-1 font-caption text-caption font-bold uppercase tracking-wide text-on-surface-variant">
                  Opt-in
                </span>
              </div>
            </div>

            <ul className="mt-lg w-full space-y-3">
              <li className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low/60 px-4 py-3">
                <span className="flex items-center gap-2 font-label-md text-label-md">
                  <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                  Double opt-in
                </span>
                <span className="font-label-md text-label-md font-bold text-primary">42,105</span>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low/60 px-4 py-3">
                <span className="flex items-center gap-2 font-label-md text-label-md">
                  <span className="h-2.5 w-2.5 rounded-full bg-surface-container-highest" />
                  Single opt-in
                </span>
                <span className="font-label-md text-label-md font-bold text-primary">52,105</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Activity + sidebar */}
      <section className="grid grid-cols-1 gap-gutter xl:grid-cols-3">
        <div className={cn(CARD, "overflow-hidden xl:col-span-2")}>
          <div className="flex items-center justify-between border-b border-outline-variant/15 px-lg py-md">
            <h2 className="font-headline-md text-headline-md text-primary">Recent Activity</h2>
            <Link
              href="/dashboard/activity"
              className="font-label-md text-label-md font-bold text-secondary transition-colors hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {ACTIVITIES.map((item) => (
              <ActivityRow key={item.title} {...item} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-gutter">
          <div className="relative overflow-hidden rounded-[24px] bg-primary-container p-lg text-on-primary shadow-nav">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-secondary/25" />
            <h3 className="relative font-headline-md text-headline-md">Automated Insights</h3>
            <p className="relative mt-2 font-body-md text-body-md leading-relaxed text-on-primary-container">
              AI detected a 14% higher engagement rate when calls are scheduled between 2:00 PM and 4:00 PM EST.
            </p>
            <button
              type="button"
              className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-on-primary px-5 py-2.5 font-label-md text-label-md font-bold text-primary transition-transform hover:scale-[1.02]"
            >
              Apply automation
              <Icon name="arrow_forward" className="text-[18px]" />
            </button>
          </div>

          <div className={cn(CARD, "flex-1 p-lg")}>
            <h3 className="font-label-md text-label-md font-bold uppercase tracking-widest text-slate-text">
              Integration Health
            </h3>
            <ul className="mt-4 space-y-3">
              {INTEGRATIONS.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3"
                >
                  <span className="flex items-center gap-3 font-label-md text-label-md font-bold text-primary">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        item.tone === "success"
                          ? "bg-tertiary-fixed-dim shadow-[0_0_8px_rgba(78,222,163,0.65)]"
                          : "bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]",
                      )}
                    />
                    {item.name}
                  </span>
                  <span
                    className={cn(
                      "font-caption text-caption font-bold uppercase tracking-wide",
                      item.tone === "success" ? "text-on-tertiary-container" : "text-warning",
                    )}
                  >
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
