"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useCampaignOptions } from "@/lib/hooks/use-campaign-options";
import { useVoiceAssets, type VoiceAsset } from "@/lib/hooks/use-voice-assets";
import {
  DEFAULT_VOICE_SCRIPT,
  loadScriptText,
  saveScriptText,
} from "@/lib/voice-studio/storage";
import {
  estimateDuration,
  formatScriptDate,
  matchesCollection,
  SCRIPT_COLLECTIONS,
  SCRIPT_FOLDERS,
  scriptCategory,
  scriptStatus,
  statusBadge,
  transcriptBlocks,
  type ScriptCollectionId,
} from "@/lib/voice-scripts/library-ui";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type VoiceScriptLibraryProps = {
  onCreateScript: () => void;
};

type DetailTab = "transcript" | "details" | "insights";

export function VoiceScriptLibrary({ onCreateScript }: VoiceScriptLibraryProps) {
  const { assets, loading, error, approve, assignToCampaign, refresh } = useVoiceAssets();
  const { options: campaigns } = useCampaignOptions();
  const [collection, setCollection] = useState<ScriptCollectionId>("all");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>("transcript");
  const [transcript, setTranscript] = useState("");
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [campaignPick, setCampaignPick] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    setTranscript(loadScriptText());
  }, []);

  useEffect(() => {
    if (!selectedId && assets.length > 0) setSelectedId(assets[0].id);
  }, [assets, selectedId]);

  useEffect(() => {
    if (campaigns[0]?.id) setCampaignPick(campaigns[0].id);
  }, [campaigns]);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (!matchesCollection(a, collection)) return false;
      if (folderId) {
        const folder = SCRIPT_FOLDERS.find((f) => f.id === folderId);
        if (folder && !folder.pattern.test(a.title)) return false;
      }
      return true;
    });
  }, [assets, collection, folderId]);

  const selected = assets.find((a) => a.id === selectedId) ?? filtered[0] ?? null;

  const collectionCounts = useMemo(() => {
    const counts: Record<ScriptCollectionId, number> = {
      all: assets.length,
      new: 0,
      approved: 0,
      pending: 0,
      campaign_ready: 0,
      archive: 0,
    };
    for (const a of assets) {
      const s = scriptStatus(a);
      if (s === "new") counts.new++;
      if (s === "approved") counts.approved++;
      if (s === "pending") counts.pending++;
      if (s === "campaign_ready") counts.campaign_ready++;
    }
    return counts;
  }, [assets]);

  const folderCounts = useMemo(() => {
    return SCRIPT_FOLDERS.map((f) => ({
      ...f,
      count: assets.filter((a) => f.pattern.test(a.title)).length,
    }));
  }, [assets]);

  const togglePlay = (asset: VoiceAsset) => {
    if (!asset.playbackUrl) return;
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }
    const audio = new Audio(asset.playbackUrl);
    audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    void audio.play();
    setPlaying(true);
  };

  const runApprove = async () => {
    if (!selected) return;
    try {
      await approve(selected.id);
      setActionMsg("Script approved");
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Approval failed");
    }
  };

  const runAssign = async () => {
    if (!selected || !campaignPick) return;
    try {
      if (!selected.approved) await approve(selected.id);
      await assignToCampaign(selected.id, campaignPick);
      setActionMsg("Assigned to campaign");
      void refresh();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Could not assign");
    }
  };

  const blocks = transcriptBlocks(transcript || DEFAULT_VOICE_SCRIPT);
  const relatedCampaign = campaigns.find((c) => c.id === selected?.script_id) ?? campaigns[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-[22px] font-semibold text-ink">Script library</h2>
          <p className="mt-1 text-[14px] text-slate-text">
            Browse, approve, and assign recordings to campaigns.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateScript}
          className="inline-flex items-center gap-2 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory hover:opacity-90"
        >
          <Icon name="add" className="text-[18px]" />
          Create script
        </button>
      </div>

      {error ? (
        <p className="rounded-xl bg-champagne px-4 py-3 text-[13px] text-taupe">{error}</p>
      ) : null}
      {actionMsg ? (
        <p className="rounded-xl bg-sage-light/50 px-4 py-2 text-[13px] text-emerald-muted">{actionMsg}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <aside className="space-y-4 xl:col-span-3">
          <LuxuryCard padding="md" className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-taupe">Collections</p>
            <ul className="space-y-1">
              {SCRIPT_COLLECTIONS.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setCollection(c.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px]",
                      collection === c.id
                        ? "bg-rose-gold/15 font-medium text-rose-gold-deep"
                        : "text-slate-text hover:bg-champagne/60",
                    )}
                  >
                    <span>{c.label}</span>
                    <span className="text-[12px] text-taupe">({collectionCounts[c.id]})</span>
                  </button>
                </li>
              ))}
            </ul>
          </LuxuryCard>

          <LuxuryCard padding="md" className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-taupe">Folders</p>
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => setFolderId(null)}
                  className={cn(
                    "w-full rounded-xl px-3 py-2 text-left text-[13px]",
                    !folderId ? "bg-champagne font-medium text-ink" : "text-slate-text hover:bg-cream",
                  )}
                >
                  All folders
                </button>
              </li>
              {folderCounts.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setFolderId(f.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px]",
                      folderId === f.id
                        ? "bg-champagne font-medium text-ink"
                        : "text-slate-text hover:bg-cream",
                    )}
                  >
                    <span>{f.label}</span>
                    <span className="text-[12px] text-taupe">({f.count})</span>
                  </button>
                </li>
              ))}
            </ul>
          </LuxuryCard>

          <LuxuryCard padding="sm" className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <p className="p-4 text-[13px] text-taupe">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-[13px] text-slate-text">No scripts in this view.</p>
            ) : (
              <ul className="divide-y divide-outline-variant/10">
                {filtered.map((asset) => {
                  const status = scriptStatus(asset);
                  const badge = statusBadge(status);
                  const active = selected?.id === asset.id;
                  return (
                    <li key={asset.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(asset.id)}
                        className={cn(
                          "w-full px-4 py-3 text-left transition-colors",
                          active ? "border-l-2 border-rose-gold bg-rose-gold/5" : "hover:bg-cream/50",
                        )}
                      >
                        <p className="font-medium text-ink line-clamp-1">{asset.title}</p>
                        <p className="mt-0.5 text-[11px] text-taupe">
                          {scriptCategory(asset.title)} · {formatScriptDate(asset.created_at)}
                        </p>
                        <span
                          className={cn(
                            "mt-2 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                            badge.className,
                          )}
                        >
                          {badge.label}
                        </span>
                        <p className="mt-1 text-[11px] text-taupe">{estimateDuration(asset.title)}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </LuxuryCard>
        </aside>

        <main className="xl:col-span-6">
          {!selected ? (
            <LuxuryCard padding="lg" className="text-center">
              <Icon name="mic" className="mx-auto text-[48px] text-taupe" />
              <p className="mt-4 font-medium text-ink">No voice scripts yet</p>
              <button
                type="button"
                onClick={onCreateScript}
                className="mt-4 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory"
              >
                Record your first script
              </button>
            </LuxuryCard>
          ) : (
            <LuxuryCard padding="lg" className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                      statusBadge(scriptStatus(selected)).className,
                    )}
                  >
                    {statusBadge(scriptStatus(selected)).label}
                  </span>
                  <span className="text-[12px] text-taupe">{formatScriptDate(selected.created_at)}</span>
                </div>
                <button type="button" className="rounded-full p-2 text-taupe hover:bg-champagne" aria-label="More">
                  <Icon name="more_horiz" />
                </button>
              </div>

              <div>
                <h2 className="font-serif text-[28px] font-semibold text-ink">{selected.title}</h2>
                <p className="mt-2 text-[14px] text-slate-text">
                  Follow up with leads using this approved ringless voicemail script.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[scriptCategory(selected.title), "Follow up", "Voicemail"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-champagne px-3 py-1 text-[11px] font-medium text-taupe"
                    >
                      {tag}
                    </span>
                  ))}
                  <button type="button" className="rounded-full border border-dashed border-outline-variant/30 px-3 py-1 text-[11px] text-taupe">
                    + Add tag
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl bg-champagne/50 px-4 py-3">
                <button
                  type="button"
                  disabled={!selected.playbackUrl}
                  onClick={() => togglePlay(selected)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-gold text-ivory disabled:opacity-40"
                >
                  <Icon name={playing ? "pause" : "play_arrow"} className="text-[28px]" />
                </button>
                <div className="flex h-10 flex-1 items-end gap-0.5">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-rose-gold/50"
                      style={{ height: `${20 + Math.abs(Math.sin(i * 0.4)) * 70}%` }}
                    />
                  ))}
                </div>
                <span className="text-[12px] font-medium text-taupe">1x</span>
              </div>

              <div className="flex gap-4 border-b border-outline-variant/15 text-[13px] font-medium">
                {(
                  [
                    { id: "transcript" as const, label: "Transcript" },
                    { id: "details" as const, label: "Details" },
                    { id: "insights" as const, label: "AI insights" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "border-b-2 pb-2 capitalize",
                      tab === t.id
                        ? "border-rose-gold text-ink"
                        : "border-transparent text-taupe hover:text-ink",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "transcript" ? (
                <div>
                  <div className="mb-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingTranscript((v) => !v)}
                      className="inline-flex items-center gap-1 text-[13px] font-medium text-rose-gold-deep hover:underline"
                    >
                      <Icon name="edit" className="text-[16px]" />
                      Edit transcript
                    </button>
                  </div>
                  {editingTranscript ? (
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      onBlur={() => saveScriptText(transcript)}
                      rows={8}
                      className="w-full rounded-xl border border-outline-variant/20 bg-ivory p-4 text-[14px] leading-relaxed"
                    />
                  ) : (
                    <ul className="space-y-4">
                      {blocks.map((b) => (
                        <li key={b.time} className="flex gap-4">
                          <span className="w-10 shrink-0 font-mono text-[12px] text-taupe">{b.time}</span>
                          <p className="text-[14px] leading-relaxed text-slate-text">{b.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-5 rounded-2xl border border-rose-gold/20 bg-rose-gold/5 px-4 py-3">
                    <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
                      <Icon name="auto_awesome" className="text-rose-gold-deep" />
                      AI summary
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-text">
                      Warm, low-pressure check-in that invites a reply without sounding salesy — ideal for
                      day-two commercial or buyer follow-up.
                    </p>
                  </div>
                </div>
              ) : null}

              {tab === "details" ? (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
                  <Detail label="Script type" value={scriptCategory(selected.title)} />
                  <Detail label="Purpose" value="Follow up" />
                  <Detail label="Length" value={estimateDuration(selected.title)} />
                  <Detail label="Language" value="English" />
                  <Detail label="Created on" value={formatScriptDate(selected.created_at)} />
                  <Detail
                    label="Status"
                    value={statusBadge(scriptStatus(selected)).label}
                  />
                </dl>
              ) : null}

              {tab === "insights" ? (
                <ul className="space-y-3 text-[14px] text-slate-text">
                  <li>Best used within 48 hours of initial contact.</li>
                  <li>Pair with an SMS nudge for higher callback rates.</li>
                  <li>Consider a shorter 30-second cut for cold lists.</li>
                </ul>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-outline-variant/10 pt-4">
                <button
                  type="button"
                  onClick={() => void runApprove()}
                  className="inline-flex items-center gap-1 rounded-full bg-sage-light px-4 py-2 text-[13px] font-medium text-emerald-muted"
                >
                  Approve
                  <Icon name="expand_more" className="text-[16px]" />
                </button>
                <button
                  type="button"
                  onClick={() => void runAssign()}
                  className="rounded-full border border-outline-variant/25 px-4 py-2 text-[13px] font-medium text-ink hover:bg-champagne"
                >
                  Assign to campaign
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTranscript(true)}
                  className="rounded-full border border-outline-variant/25 px-4 py-2 text-[13px] font-medium text-ink hover:bg-champagne"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={onCreateScript}
                  className="rounded-full border border-outline-variant/25 px-4 py-2 text-[13px] font-medium text-ink hover:bg-champagne"
                >
                  Duplicate
                </button>
              </div>
            </LuxuryCard>
          )}
        </main>

        <aside className="space-y-4 xl:col-span-3">
          {campaigns.length > 0 && relatedCampaign ? (
            <LuxuryCard padding="md">
              <h3 className="font-serif text-[18px] font-semibold text-ink">Related campaigns</h3>
              <div className="mt-3 rounded-2xl border border-outline-variant/15 bg-cream/40 p-4">
                <p className="font-medium text-ink">{relatedCampaign.name}</p>
                <p className="mt-1 text-[12px] text-taupe">Active · {assets.length} scripts linked</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-taupe">
                  <div>
                    <p className="font-serif text-[16px] font-semibold text-ink">1.2k</p>
                    Contacts
                  </div>
                  <div>
                    <p className="font-serif text-[16px] font-semibold text-ink">28%</p>
                    Call rate
                  </div>
                  <div>
                    <p className="font-serif text-[16px] font-semibold text-ink">12%</p>
                    Appt. rate
                  </div>
                </div>
                <select
                  className="mt-3 w-full rounded-xl border border-outline-variant/20 bg-ivory px-3 py-2 text-[12px]"
                  value={campaignPick}
                  onChange={(e) => setCampaignPick(e.target.value)}
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void runAssign()}
                  className="mt-3 w-full rounded-full bg-rose-gold py-2 text-[12px] font-medium text-ivory"
                >
                  Assign to this campaign
                </button>
              </div>
            </LuxuryCard>
          ) : null}

          <LuxuryCard padding="md">
            <h3 className="font-serif text-[18px] font-semibold text-ink">Usage history</h3>
            <ul className="mt-3 space-y-3 text-[13px]">
              {selected ? (
                <>
                  <li className="flex gap-3">
                    <Icon name="campaign" className="shrink-0 text-taupe" />
                    <div>
                      <p className="font-medium text-ink">Used in campaign</p>
                      <p className="text-[12px] text-taupe">{formatScriptDate(selected.created_at)}</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <Icon name="send" className="shrink-0 text-taupe" />
                    <div>
                      <p className="font-medium text-ink">Manually sent</p>
                      <p className="text-[12px] text-taupe">Recent activity</p>
                    </div>
                  </li>
                </>
              ) : null}
            </ul>
          </LuxuryCard>

          <LuxuryCard padding="md">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-[18px] font-semibold text-ink">Notes</h3>
              <button type="button" className="text-taupe hover:text-ink" aria-label="Add note">
                <Icon name="add" />
              </button>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-text">
              Tone is warm and professional — consider slightly slower pacing on the opening line.
            </p>
          </LuxuryCard>

          <LuxuryCard padding="md" className="border border-violet-200/50 bg-violet-50/30">
            <p className="flex items-center gap-2 font-medium text-ink">
              <Icon name="auto_awesome" className="text-violet-700" />
              AI recommendations
            </p>
            <ul className="mt-3 space-y-2">
              {[
                "Create a variation for retail properties",
                "Shorten for voicemail (30 seconds)",
                "Translate to Spanish",
              ].map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl bg-ivory/80 px-3 py-2 text-left text-[12px] text-slate-text hover:bg-ivory"
                  >
                    {item}
                    <Icon name="chevron_right" className="text-[18px] text-taupe" />
                  </button>
                </li>
              ))}
            </ul>
          </LuxuryCard>

          <Link
            href="/dashboard/campaigns"
            className="block text-center text-[13px] font-medium text-rose-gold-deep hover:underline"
          >
            Open campaign builder →
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-taupe">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
