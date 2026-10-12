"use client";

import {
  CampaignLibraryCard,
  CampaignLibraryListRow,
  type CampaignLibraryCardProps,
} from "@/components/campaigns/campaign-library-card";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import {
  CAMPAIGN_LIBRARY_FOLDERS,
  channelsFromTemplate,
  demoContactCount,
  formatLastEdited,
  heroImageForKey,
  templateForCampaignName,
} from "@/lib/campaigns/library-ui";
import { cn } from "@/lib/cn";
import {
  PRODUCT_CAMPAIGN_TEMPLATES,
  type ProductCampaignTemplate,
} from "@/lib/crm/campaign-templates";
import { RECOMMENDED_INSTALL_ORDER } from "@/lib/crm/engagement-score";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type CampaignRow = {
  id: string;
  name: string;
  status: "draft" | "queued" | "sending" | "sent" | "partial" | "failed";
  provider: string;
  script_id: string;
  created_at: string;
  updated_at: string;
};

type LibraryTab = "all" | "recommended" | "mine" | "shared" | "templates";
type ViewMode = "grid" | "list";

const LIBRARY_TABS: { id: LibraryTab; label: string }[] = [
  { id: "all", label: "All campaigns" },
  { id: "recommended", label: "Recommended" },
  { id: "mine", label: "My campaigns" },
  { id: "shared", label: "Shared with me" },
  { id: "templates", label: "Templates" },
];

function campaignToCard(c: CampaignRow, pinned: boolean): CampaignLibraryCardProps {
  const tpl = templateForCampaignName(c.name);
  return {
    href: `/dashboard/campaigns/${c.id}`,
    name: c.name,
    description:
      tpl?.description ??
      "Create, organize, and automate outreach with email, SMS, and ringless voicemail.",
    imageSrc: heroImageForKey(c.id),
    status: c.status,
    pinned,
    contactCount: demoContactCount(c.id),
    durationLabel: tpl
      ? `${tpl.durationDays} days · ${tpl.steps.length} steps`
      : "Custom sequence",
    lastEdited: formatLastEdited(c.updated_at || c.created_at),
    channels: channelsFromTemplate(c.name),
  };
}

function templateToCard(
  tpl: ProductCampaignTemplate,
  onClick: () => void,
): CampaignLibraryCardProps {
  const channels = [...new Set(tpl.steps.map((s) => s.type))].filter(
    (t) => t !== "retargeting",
  );
  return {
    href: "#",
    name: tpl.name,
    description: tpl.description,
    imageSrc: heroImageForKey(tpl.templateKey),
    status: "draft",
    contactCount: 0,
    durationLabel: `${tpl.durationDays} days · ${tpl.steps.length} steps`,
    lastEdited: "Template",
    channels,
    onClick,
  };
}

export function CampaignListPanel() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LibraryTab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const envelope = await safeFetch<{ campaigns: CampaignRow[] }>("/api/campaigns");
      setLoading(false);
      if (envelope.success) setCampaigns(envelope.data.campaigns);
      else setError(envelope.error);
    })();
  }, []);

  const recommendedTemplates = useMemo(() => {
    const byKey = new Map(PRODUCT_CAMPAIGN_TEMPLATES.map((t) => [t.templateKey, t]));
    return RECOMMENDED_INSTALL_ORDER.map((key) => byKey.get(key)).filter(
      (t): t is ProductCampaignTemplate => Boolean(t),
    );
  }, []);

  const recommendedNames = useMemo(
    () => new Set(recommendedTemplates.map((t) => t.name.toLowerCase())),
    [recommendedTemplates],
  );

  const createFromTemplate = async (templateKey: string, withAutomation = true) => {
    setCreatingKey(templateKey);
    setError(null);
    const envelope = await safeFetch<{ campaignId: string }>("/api/campaigns/from-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateKey, createAutomation: withAutomation }),
    });
    setCreatingKey(null);
    if (!envelope.success) {
      setError(envelope.error);
      return;
    }
    router.push(`/dashboard/campaigns/${envelope.data.campaignId}`);
  };

  const sortedCampaigns = useMemo(() => {
    const statusRank: Record<CampaignRow["status"], number> = {
      sending: 0,
      sent: 1,
      queued: 2,
      partial: 3,
      draft: 4,
      failed: 5,
    };
    return [...campaigns].sort((a, b) => {
      const sr = statusRank[a.status] - statusRank[b.status];
      if (sr !== 0) return sr;
      return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
    });
  }, [campaigns]);

  const searchLower = search.trim().toLowerCase();

  const filteredCampaigns = useMemo(() => {
    let list = sortedCampaigns;
    if (activeTab === "recommended") {
      list = list.filter((c) => recommendedNames.has(c.name.toLowerCase()));
    } else if (activeTab === "mine" || activeTab === "all") {
      list = sortedCampaigns;
    } else if (activeTab === "shared") {
      list = [];
    } else if (activeTab === "templates") {
      list = [];
    }
    if (searchLower) {
      list = list.filter((c) => c.name.toLowerCase().includes(searchLower));
    }
    return list;
  }, [sortedCampaigns, activeTab, recommendedNames, searchLower]);

  const pinnedCampaigns = useMemo(() => sortedCampaigns.slice(0, 3), [sortedCampaigns]);

  const tabCounts: Record<LibraryTab, number> = useMemo(
    () => ({
      all: campaigns.length || sortedCampaigns.length,
      recommended: recommendedTemplates.length,
      mine: campaigns.length,
      shared: 0,
      templates: PRODUCT_CAMPAIGN_TEMPLATES.length,
    }),
    [campaigns.length, sortedCampaigns.length, recommendedTemplates.length],
  );

  const showPinnedSection =
    activeTab === "all" || activeTab === "mine" || activeTab === "recommended";

  const renderGrid = (items: CampaignLibraryCardProps[]) => (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {items.map((item) => (
        <li key={item.href + item.name} className="min-h-[320px]">
          <CampaignLibraryCard {...item} />
        </li>
      ))}
    </ul>
  );

  const renderList = (items: CampaignLibraryCardProps[]) => (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.href + item.name}>
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-outline-variant/15 bg-ivory px-4 py-3 text-left transition-shadow hover:shadow-nav"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{item.name}</p>
                <p className="text-[12px] text-taupe">{item.durationLabel} · Install template</p>
              </div>
              <span className="shrink-0 rounded-full bg-champagne px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-taupe">
                Template
              </span>
            </button>
          ) : (
            <CampaignLibraryListRow
              href={item.href}
              name={item.name}
              status={item.status}
              lastEdited={item.lastEdited}
              contactCount={item.contactCount}
            />
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-8 pb-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
            Campaign library
          </p>
          <h1 className="mt-1 font-serif text-[32px] font-semibold leading-tight text-ink sm:text-[36px]">
            All campaigns
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-text">
            Create, organize, and automate your outreach with ready-to-use campaigns or build your
            own.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-full border border-outline-variant/25 bg-ivory px-5 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-champagne"
          >
            Import campaign
          </button>
          <Link
            href="/dashboard/campaigns?new=1#campaign-builder"
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-gold px-5 py-2.5 text-[13px] font-medium text-ivory transition-opacity hover:opacity-90"
          >
            <Icon name="add" className="text-[18px]" />
            Build custom
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-4 border-b border-outline-variant/15 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {LIBRARY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-rose-gold text-ivory"
                  : "bg-champagne/60 text-taupe hover:bg-champagne",
              )}
            >
              {tab.label} ({tabCounts[tab.id]})
            </button>
          ))}
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-outline-variant/20 px-3 py-2 text-[12px] font-medium text-taupe"
          >
            <Icon name="folder" className="text-[16px]" />
            Saved views
          </button>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1 max-w-md">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-taupe"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns…"
              className="w-full rounded-full border border-outline-variant/20 bg-ivory py-2.5 pl-10 pr-4 text-[14px] text-ink placeholder:text-taupe focus:border-rose-gold/40 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["Status", "Goal", "Audience", "Channel", "Owner"].map((label) => (
              <button
                key={label}
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-outline-variant/20 bg-ivory px-3 py-1.5 text-[12px] font-medium text-taupe"
              >
                {label}
                <Icon name="expand_more" className="text-[16px]" />
              </button>
            ))}
            <button
              type="button"
              className="rounded-full border border-outline-variant/20 px-3 py-1.5 text-[12px] font-medium text-taupe"
            >
              More filters
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-outline-variant/20 px-3 py-1.5 text-[12px] font-medium text-taupe"
            >
              Last edited
              <Icon name="expand_more" className="text-[16px]" />
            </button>
            <div className="flex rounded-full border border-outline-variant/20 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-full p-1.5",
                  viewMode === "grid" ? "bg-champagne text-ink" : "text-taupe",
                )}
                aria-label="Grid view"
              >
                <Icon name="grid_view" className="text-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-full p-1.5",
                  viewMode === "list" ? "bg-champagne text-ink" : "text-taupe",
                )}
                aria-label="List view"
              >
                <Icon name="view_list" className="text-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-error/30 bg-error/5 p-3 text-[13px] text-error">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="py-12 text-center text-[14px] text-taupe">Loading campaigns…</p>
      ) : activeTab === "shared" ? (
        <LuxuryCard padding="lg" className="text-center">
          <Icon name="group" className="mx-auto text-[36px] text-taupe" />
          <p className="mt-3 font-medium text-ink">Nothing shared with you yet</p>
          <p className="mt-1 text-[14px] text-slate-text">
            When a teammate shares a campaign folder, it will appear here.
          </p>
        </LuxuryCard>
      ) : activeTab === "templates" ? (
        <section>
          <SectionHeader
            title={`Templates (${PRODUCT_CAMPAIGN_TEMPLATES.length})`}
            subtitle="Install a playbook to add it to your library."
          />
          {viewMode === "grid"
            ? renderGrid(
                PRODUCT_CAMPAIGN_TEMPLATES.filter((t) =>
                  searchLower ? t.name.toLowerCase().includes(searchLower) : true,
                ).map((tpl) =>
                  templateToCard(tpl, () =>
                    void createFromTemplate(tpl.templateKey, Boolean(tpl.automation)),
                  ),
                ),
              )
            : renderList(
                PRODUCT_CAMPAIGN_TEMPLATES.map((tpl) =>
                  templateToCard(tpl, () =>
                    void createFromTemplate(tpl.templateKey, Boolean(tpl.automation)),
                  ),
                ),
              )}
        </section>
      ) : activeTab === "recommended" && filteredCampaigns.length === 0 ? (
        <section>
          <SectionHeader
            title="Recommended"
            subtitle="Priority playbooks from your MyARI playbook — install to start."
          />
          {viewMode === "grid"
            ? renderGrid(
                recommendedTemplates.map((tpl) =>
                  templateToCard(tpl, () =>
                    void createFromTemplate(tpl.templateKey, Boolean(tpl.automation)),
                  ),
                ),
              )
            : renderList(
                recommendedTemplates.map((tpl) =>
                  templateToCard(tpl, () =>
                    void createFromTemplate(tpl.templateKey, Boolean(tpl.automation)),
                  ),
                ),
              )}
        </section>
      ) : (
        <>
          {showPinnedSection && pinnedCampaigns.length > 0 ? (
            <section>
              <SectionHeader
                title={`Pinned (${pinnedCampaigns.length})`}
                subtitle="Your most important campaigns, pinned for quick access."
                actionHref="/dashboard/campaigns"
                actionLabel="Show all"
              />
              {viewMode === "grid"
                ? renderGrid(
                    pinnedCampaigns.map((c) => campaignToCard(c, true)),
                  )
                : renderList(pinnedCampaigns.map((c) => campaignToCard(c, true)))}
            </section>
          ) : null}

          {activeTab === "all" || activeTab === "mine" ? (
            <section>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SectionHeader
                  title={`Folders (${CAMPAIGN_LIBRARY_FOLDERS.length})`}
                  subtitle="Organize your campaigns by goal, audience, or custom groups."
                  compact
                />
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-outline-variant/25 px-4 py-2 text-[13px] font-medium text-rose-gold-deep"
                >
                  <Icon name="create_new_folder" className="text-[18px]" />
                  Create folder
                </button>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {CAMPAIGN_LIBRARY_FOLDERS.map((folder) => (
                  <li key={folder.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-2xl border border-outline-variant/15 bg-champagne/40 px-4 py-4 text-left transition-colors hover:bg-champagne/70"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Icon name="folder" className="shrink-0 text-[22px] text-rose-gold-deep" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{folder.name}</p>
                          <p className="text-[12px] text-taupe">{folder.count} campaigns</p>
                        </div>
                      </div>
                      <Icon name="more_horiz" className="shrink-0 text-taupe" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <SectionHeader
              title={`All campaigns (${filteredCampaigns.length || campaigns.length})`}
              subtitle="Browse, edit, and launch campaigns. Use filters or saved views to find what you need."
            />
            {filteredCampaigns.length === 0 ? (
              <LuxuryCard padding="lg" className="text-center">
                <Icon name="campaign" className="mx-auto text-[40px] text-rose-gold-deep" />
                <p className="mt-3 font-medium text-ink">No campaigns match</p>
                <p className="mt-1 text-[14px] text-slate-text">
                  Try another filter or{" "}
                  <Link href="/dashboard/campaigns?new=1#campaign-builder" className="text-rose-gold-deep hover:underline">
                    build a custom campaign
                  </Link>
                  .
                </p>
              </LuxuryCard>
            ) : viewMode === "grid" ? (
              renderGrid(filteredCampaigns.map((c) => campaignToCard(c, false)))
            ) : (
              renderList(filteredCampaigns.map((c) => campaignToCard(c, false)))
            )}
          </section>
        </>
      )}

      {creatingKey ? (
        <p className="fixed bottom-6 right-6 z-50 rounded-full bg-ink px-4 py-2 text-[13px] text-ivory shadow-lg">
          Creating campaign…
        </p>
      ) : null}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
  compact,
}: {
  title: string;
  subtitle: string;
  actionHref?: string;
  actionLabel?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-2", compact ? "mb-0" : "mb-4")}>
      <div>
        <h2 className={cn("font-serif font-semibold text-ink", compact ? "text-[20px]" : "text-[22px]")}>
          {title}
        </h2>
        {!compact ? <p className="mt-1 text-[14px] text-slate-text">{subtitle}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="text-[13px] font-medium text-rose-gold-deep hover:underline">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
