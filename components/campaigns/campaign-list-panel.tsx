"use client";
import { useAiRecordContext } from "@/components/ai/ai-assistant-context";
import {
  allocateCampaignArt,
  campaignCover,
} from "@/lib/campaigns/library-art";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { safeFetch } from "@/lib/api-response";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/crm/modal";
import { CampaignLibraryCard, type Cover } from "./campaign-library-card";
import { CampaignPreviewDrawer } from "./campaign-preview-drawer";
import {
  campaignCounts,
  isLibraryCampaign,
  sequenceSummary,
  type LibraryCampaign,
  type LibraryPreview,
  type LibraryStep,
} from "@/lib/campaigns/library-data";
import {
  CampaignImportSchema,
  duplicateBlueprint,
} from "@/lib/campaigns/library-transfer";
import { PRODUCT_CAMPAIGN_TEMPLATES } from "@/lib/crm/campaign-templates";
import { RECOMMENDED_INSTALL_ORDER } from "@/lib/crm/engagement-score";
import { delayFromDayLabel } from "@/lib/campaigns/delay-from-day-label";
const TABS = [
  ["all", "All campaigns"],
  ["recommended", "Recommended"],
  ["mine", "My campaigns"],
  ["shared", "Shared with me"],
  ["templates", "Templates"],
] as const;
type Tab = (typeof TABS)[number][0];
const readStorage = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};
const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};
function templatePreview(key: string): LibraryPreview {
  const t = PRODUCT_CAMPAIGN_TEMPLATES.find((t) => t.templateKey === key)!;
  const steps: LibraryStep[] = t.steps.map((s) => ({
    id: s.id,
    step_order: s.order,
    type: s.type,
    title: s.title,
    description: s.description,
    delay_minutes: delayFromDayLabel(s.dayLabel),
    day_label: s.dayLabel,
    time_label: s.timeLabel,
  }));
  return {
    campaign: {
      id: `template:${key}`,
      name: t.name,
      description: t.description,
      audience: t.audience,
      goals: t.goals,
      status: "draft",
      created_at: "",
      enrollmentCount: 0,
      ...sequenceSummary(steps),
    },
    steps,
    recipients: [],
    runs: [],
    engagement: [],
    performanceAvailable: false,
  };
}
export function CampaignListPanel() {
  const { user, isLoaded } = useUser();
  return isLoaded && user ? (
    <CampaignLibraryWorkspace key={user.id} ownerId={user.id} />
  ) : (
    <p role="status">Loading campaign workspace…</p>
  );
}
function CampaignLibraryWorkspace({ ownerId }: { ownerId: string }) {
  const [campaigns, setCampaigns] = useState<LibraryCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [sort, setSort] = useState("edited");
  const [view, setView] = useState("grid");
  const [pins, setPins] = useState<string[]>([]);
  const [selected, setSelected] = useState<LibraryCampaign | null>(null);
  useAiRecordContext({page:"/dashboard/campaigns",campaignId:selected?.id});
  const [notice, setNotice] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [busy, setBusy] = useState(false);
  const [art, setArt] = useState<Record<string, number>>({});
  useEffect(() => {
    const changed = () => setVersion((v) => v + 1);
    window.addEventListener("myari:campaigns-changed", changed);
    return () => window.removeEventListener("myari:campaigns-changed", changed);
  }, []);
  const closePreview = useCallback(() => setSelected(null), []);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    try {
      const value = JSON.parse(
        readStorage(`myari:campaign-pins:${ownerId}`, "[]"),
      );
      if (Array.isArray(value))
        setPins(value.filter((v): v is string => typeof v === "string"));
    } catch {}
    try {
      const value = JSON.parse(
        readStorage(`myari:campaign-art:${ownerId}`, "{}"),
      );
      if (value && typeof value === "object" && !Array.isArray(value))
        setArt(value);
    } catch {}
  }, [ownerId]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    void safeFetch<{ campaigns: LibraryCampaign[] }>("/api/campaigns/library", {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    }).then((r) => {
      if (controller.signal.aborted) return;
      setLoading(false);
      if (
        r.success &&
        Array.isArray(r.data.campaigns) &&
        r.data.campaigns.every(isLibraryCampaign)
      )
        setCampaigns([
          ...new Map(r.data.campaigns.map((c) => [c.id, c])).values(),
        ]);
      else {
        setFailed(true);
        setCampaigns([]);
      }
    });
    return () => controller.abort();
  }, [version]);
  const templates = useMemo(
    () => PRODUCT_CAMPAIGN_TEMPLATES.map((t) => templatePreview(t.templateKey)),
    [],
  );
  useEffect(() => {
    if (loading || failed) return;
    setArt((previous) => {
      const keys = [
        ...campaigns.map((c) => c.id),
        ...templates.map((t) => t.campaign.id),
      ];
      const next = allocateCampaignArt(keys, previous);
      if (JSON.stringify(next) === JSON.stringify(previous)) return previous;
      writeStorage(`myari:campaign-art:${ownerId}`, JSON.stringify(next));
      return next;
    });
  }, [campaigns, templates, ownerId, loading, failed]);
  const cover = (c: LibraryCampaign): Cover => campaignCover(c, art);
  const togglePin = (id: string) => {
    setPins((old) => {
      const next = old.includes(id)
        ? old.filter((v) => v !== id)
        : [...old, id];
      if (!writeStorage(`myari:campaign-pins:${ownerId}`, JSON.stringify(next)))
        setNotice("Pin saved for this visit. Browser storage is unavailable.");
      return next;
    });
  };
  const isTemplate = selected?.id.startsWith("template:");
  const selectedTemplate = isTemplate
    ? templates.find((t) => t.campaign.id === selected?.id)
    : undefined;
  const recommended = templates.filter((t) =>
    RECOMMENDED_INSTALL_ORDER.some(
      (key) => key === t.campaign.id.replace("template:", ""),
    ),
  );
  const source =
    tab === "templates"
      ? templates.map((t) => t.campaign)
      : tab === "recommended"
        ? recommended.map((t) => t.campaign)
        : tab === "shared"
          ? []
          : campaigns;
  const filtered = source
    .filter(
      (c) =>
        (!query.trim() ||
          `${c.name} ${c.description ?? ""}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())) &&
        (!status || c.status === status) &&
        (!channel || c.channels.includes(channel)) &&
        (!goal || c.goals?.includes(goal)) &&
        (!audience || c.audience === audience),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "oldest"
          ? (a.updated_at || a.created_at).localeCompare(
              b.updated_at || b.created_at,
            )
          : (b.updated_at || b.created_at).localeCompare(
              a.updated_at || a.created_at,
            ),
    );
  const counts = campaignCounts(
    filtered.filter((c) => !c.id.startsWith("template:")),
  );
  const metricRows =
    tab === "templates" || tab === "recommended" || tab === "shared"
      ? campaignCounts(campaigns)
      : counts;
  const tabCounts = {
    all: campaigns.length,
    mine: campaigns.length,
    recommended: recommended.length,
    shared: "—",
    templates: templates.length,
  };
  const createDraft = async (blueprint: unknown) => {
    const parsed = CampaignImportSchema.safeParse(blueprint);
    if (!parsed.success) throw Error("invalid");
    const result = await safeFetch<{ campaignId: string }>(
      "/api/campaigns/builder",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "template",
          campaign: {
            ...parsed.data,
            id: `campaign-${crypto.randomUUID()}`,
            provider: "mock",
          },
        }),
      },
    );
    if (!result.success || !result.data.campaignId) throw Error("save");
    refresh();
    setTab("mine");
    setQuery("");
    setStatus("");
    setChannel("");
    setGoal("");
    setAudience("");
    setNotice("Draft saved. No contacts enrolled or messages scheduled.");
    setSelected(null);
  };
  const duplicate = async (data: LibraryPreview) => {
    await createDraft(duplicateBlueprint(data));
  };
  const install = async () => {
    if (!selectedTemplate) return;
    const res = await safeFetch<{ campaignId: string; alreadyExisted?:boolean }>(
      "/api/campaigns/from-template",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: selectedTemplate.campaign.id.replace("template:", ""),
          createAutomation: false,
        }),
      },
    );
    if (!res.success) throw Error();
    refresh();
    setTab("mine");
    setSelected(null);
    setQuery("");setStatus("");setChannel("");setGoal("");setAudience("");
    setNotice(res.data.alreadyExisted ? "This playbook is already in your library. Its existing status is unchanged." : "Playbook available as a draft. No automation was activated.");
  };
  const importDraft = async () => {
    setBusy(true);
    setImportError("");
    try {
      if (importText.length > 500000) throw Error();
      const value = JSON.parse(importText);
      const parsed = CampaignImportSchema.safeParse(value);
      if (
        !parsed.success ||
        parsed.data.steps.some((s) => s.voiceAssetId || s.attachments?.length)
      ) {
        setImportError(
          "Use the documented campaign JSON format. Import message content only; link your own recordings and attachments in the editor.",
        );
        return;
      }
      await createDraft(parsed.data);
      setImportOpen(false);
      setImportText("");
    } catch {
      setImportError(
        "Unable to import this campaign. Check the JSON format and try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const renderCard = (c: LibraryCampaign) => (
    <CampaignLibraryCard
      key={c.id}
      campaign={c}
      cover={cover(c)}
      pinned={pins.includes(c.id)}
      onPin={c.id.startsWith("template:") ? undefined : () => togglePin(c.id)}
      onOpen={() => setSelected(c)}
      isTemplate={c.id.startsWith("template:")}
      view={view}
    />
  );
  return (
    <div className="campaigns-premium">
      <section className="cl-hero">
        <Image
          src="/brand/heroes/campaign-library-interior.png"
          alt="Sunlit luxury residential library with cream armchairs"
          fill
          priority
          sizes="(max-width:768px) 100vw, 1200px"
        />
        <div className="cl-hero-copy">
          <p className="cl-eyebrow">CAMPAIGNS</p>
          <h1>Stay connected. Stay top of mind.</h1>
          <p>
            Create thoughtful outreach that turns conversations into
            opportunities.
          </p>
        </div>
      </section>
      <section className="cl-kpis" aria-label="Campaign summary">
        {[
          ["Total Campaigns", "campaign", metricRows.total],
          ["Active Campaigns", "play_arrow", metricRows.active],
          ["Drafts", "draft", metricRows.draft],
          ["Queued", "schedule", metricRows.queued],
        ].map(([label, icon, value]) => (
          <div className="cl-kpi" key={label}>
            <span className="cl-kpi-icon">
              <Icon name={String(icon)} />
            </span>
            <div>
              <p>{label}</p>
              <strong>
                {loading || failed ? "—" : Number(value).toLocaleString()}
              </strong>
              <small>
                {label === "Active Campaigns"
                  ? "Sending campaigns"
                  : tab === "all" || tab === "mine"
                    ? "Matching library filters"
                    : "Your saved campaigns"}
              </small>
            </div>
          </div>
        ))}
      </section>
      <section className="cl-library" aria-label="Campaign library">
        <div className="cl-library-top">
          <div
            className="cl-library-tabs"
            role="group"
            aria-label="Campaign collections"
          >
            {TABS.map(([id, label]) => (
              <button
                className={`cl-button ${tab === id ? "cl-primary" : ""}`}
                key={id}
                aria-pressed={tab === id}
                onClick={() => {
                  setTab(id);
                  setStatus("");
                  setChannel("");
                  setGoal("");
                  setAudience("");
                }}
              >
                {label} (
                {loading && id !== "templates" && id !== "recommended"
                  ? "…"
                  : tabCounts[id]}
                )
              </button>
            ))}
          </div>
          <div className="cl-library-actions">
            <button
              aria-label="Import campaign"
              className="cl-button"
              onClick={() => setImportOpen(true)}
            >
              <Icon name="upload" />
              Import campaign
            </button>
            <Link
              className="cl-button cl-primary"
              href="/dashboard/campaigns?new=1#campaign-builder"
            >
              <Icon name="add" />
              Build custom
            </Link>
          </div>
        </div>
        <div className="cl-filters">
          <label className="cl-search">
            <Icon name="search" />
            <input
              type="search"
              aria-label="Search campaigns"
              placeholder="Search campaigns…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Status</span>
            <select
              aria-label="Campaign status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Status</option>
              {[...new Set(source.map((c) => c.status))].sort().map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Channel</span>
            <select
              aria-label="Campaign channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="">Channel</option>
              {[...new Set(source.flatMap((c) => c.channels))]
                .sort()
                .map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
            </select>
          </label>
          {[
            {
              label: "Goal",
              value: goal,
              set: setGoal,
              values: [...new Set(source.flatMap((c) => c.goals ?? []))],
            },
            {
              label: "Audience",
              value: audience,
              set: setAudience,
              values: [
                ...new Set(
                  source.map((c) => c.audience).filter((v): v is string => !!v),
                ),
              ],
            },
          ]
            .filter((f) => f.values.length)
            .map((f) => (
              <label key={f.label}>
                <span className="sr-only">{f.label}</span>
                <select
                  aria-label={`Campaign ${f.label.toLowerCase()}`}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                >
                  <option value="">{f.label}</option>
                  {f.values.sort().map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          <label>
            <span className="sr-only">Sort</span>
            <select
              aria-label="Campaign sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="edited">Last edited</option>
              <option value="oldest">Oldest edited</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
          <div className="cl-view-toggle">
            {["grid", "list"].map((mode) => (
              <button
                className="cl-icon-button"
                key={mode}
                aria-label={`${mode === "grid" ? "Grid" : "List"} view`}
                aria-pressed={view === mode}
                onClick={() => setView(mode)}
              >
                <Icon name={mode === "grid" ? "grid_view" : "view_list"} />
              </button>
            ))}
          </div>
          {query || status || channel || goal || audience ? (
            <button
              className="cl-button"
              onClick={() => {
                setQuery("");
                setStatus("");
                setChannel("");
                setGoal("");
                setAudience("");
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
        {notice ? (
          <p className="cl-notice" role="status">
            {notice}
          </p>
        ) : null}
        {loading ? (
          <div className="cl-empty" role="status">
            Loading your campaigns…
          </div>
        ) : failed ? (
          <div className="cl-empty" role="alert">
            <h2>Campaign library unavailable</h2>
            <p>We couldn’t load your saved campaigns. Please try again.</p>
            <button className="cl-button" onClick={refresh}>
              Retry library
            </button>
          </div>
        ) : tab === "shared" ? (
          <div className="cl-empty">
            <Icon name="group" />
            <h2>No shared campaigns</h2>
            <p>
              Incoming campaign access is not available in this library. Your
              private campaigns remain in My campaigns.
            </p>
          </div>
        ) : (
          <>
            {filtered.some((c) => pins.includes(c.id)) ? (
              <section className="cl-pinned">
                <h2>
                  Pinned <small>Saved in this browser</small>
                </h2>
                <div className={`cl-grid ${view === "list" ? "is-list" : ""}`}>
                  {filtered.filter((c) => pins.includes(c.id)).map(renderCard)}
                </div>
              </section>
            ) : null}
            <div
              className={`cl-results-heading ${tab === "all" || tab === "mine" ? "sr-only" : ""}`}
            >
              <h2>
                {tab === "templates"
                  ? "Starter templates"
                  : tab === "recommended"
                    ? "Recommended playbooks"
                    : "Your campaigns"}{" "}
                <span>({filtered.length})</span>
              </h2>
              {tab === "recommended" ? (
                <p>
                  Curated MyARI playbooks. Preview before installing as a draft.
                </p>
              ) : null}
            </div>
            {filtered.length ? (
              <div className={`cl-grid ${view === "list" ? "is-list" : ""}`}>
                {filtered.filter((c) => !pins.includes(c.id)).map(renderCard)}
              </div>
            ) : (
              <div className="cl-empty">
                <Icon name="campaign" />
                <h2>
                  {query || status || channel || goal || audience
                    ? "No campaigns match"
                    : "Your next conversation starts here"}
                </h2>
                <p>
                  {query || status || channel || goal || audience
                    ? "Adjust your search or clear the filters."
                    : "Explore the starter templates or build a custom sequence."}
                </p>
              </div>
            )}
          </>
        )}
      </section>
      {selected ? (
        <CampaignPreviewDrawer
          key={selected.id}
          campaign={selected}
          cover={cover(selected)}
          templatePreview={selectedTemplate}
          onClose={closePreview}
          pinned={pins.includes(selected.id)}
          onPin={() => togglePin(selected.id)}
          onDuplicate={duplicate}
          onInstall={install}
          onChanged={refresh}
        />
      ) : null}
      <Modal
        open={importOpen}
        onClose={() => {
          if (!busy) setImportOpen(false);
        }}
        title="Import campaign"
        description="Import message content as a simulation draft. No contacts or schedules are imported."
        size="lg"
      >
        <label className="cl-file-label">
          Campaign JSON file
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 500000) {
                setImportError("Choose a JSON file smaller than 500 KB.");
                return;
              }
              try {
                setImportText(await file.text());
                setImportError("");
              } catch {
                setImportError("Could not read this file.");
              }
            }}
          />
        </label>
        <label className="cl-file-label">
          Or paste campaign JSON
          <textarea
            aria-label="Campaign JSON"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
          />
        </label>
        <details>
          <summary>View import format</summary>
          <pre className="cl-message">
            {JSON.stringify(
              {
                name: "Your campaign name",
                description: "Your description",
                steps: [
                  {
                    id: "step-1",
                    order: 1,
                    type: "email",
                    title: "Your subject",
                    description: "Your message",
                    delayMinutes: 0,
                  },
                ],
              },
              null,
              2,
            )}
          </pre>
        </details>
        {importError ? (
          <p role="alert" className="cl-error">
            {importError}
          </p>
        ) : null}
        <button
          className="cl-button cl-primary"
          disabled={busy || !importText.trim()}
          onClick={() => void importDraft()}
        >
          {busy ? "Importing…" : "Import as draft"}
        </button>
      </Modal>
    </div>
  );
}
