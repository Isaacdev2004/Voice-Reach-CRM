"use client";
import { AudioWaveform } from "@/components/voice-studio/audio-waveform";
import { AiLauncherButton } from "@/components/ai/ai-launcher-button";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useVoiceAssets, type VoiceAsset } from "@/lib/hooks/use-voice-assets";
import { TestVoiceScript } from "@/components/voice-studio/test-voice-script";
import { voiceChecks } from "@/lib/voice-studio/verification";
import { SCRIPT_FOLDERS, scriptCategory } from "@/lib/voice-scripts/library-ui";
import "@/components/voice-studio/voice-studio.css";
export function VoiceScriptLibrary({
  onCreateScript,
}: {
  onCreateScript: (asset?: VoiceAsset) => void;
}) {
  const { assets, loading, error, refresh } = useVoiceAssets();
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [category, setCategory] = useState("");
  const [tab, setTab] = useState("Record & edit"),
    [notice, setNotice] = useState("");
  const filtered = useMemo(
    () =>
      assets.filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) &&
          (status === "archived"
            ? a.studio_metadata?.archived
            : !a.studio_metadata?.archived) &&
          (status === "approved"
            ? a.approved
            : status === "draft"
              ? !a.approved
              : true) &&
          (!category ||
            SCRIPT_FOLDERS.find((f) => f.id === category)?.pattern.test(
              a.title,
            )),
      ),
    [assets, query, status, category],
  );
  const selected =
    filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null;
  const [duration, setDuration] = useState<number | null>(null);
  useEffect(() => setDuration(null), [selected?.id]);
  const archive = async () => {
    if (!selected) return;
    try {
      const r = await fetch(`/api/voice-assets/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioMetadata: { archived: !selected.studio_metadata?.archived },
        }),
      });
      if (!r.ok) throw Error();
      await refresh();
      setNotice(
        "Recording library updated. Existing campaign audio is unchanged.",
      );
    } catch {
      setNotice("Recording could not be archived. Please retry.");
    }
  };
  return (
    <div className="vs-workspace">
      <header className="vs-heading">
        <div>
          <h2>Voice Scripts Library</h2>
          <p>
            Organize your scripts and recordings. Review every version before
            campaign use.
          </p>
        </div>
        <div className="vs-actions">
          <AiLauncherButton label="Ask MyARI" />
          <button
            className="vs-primary"
            type="button"
            onClick={() => onCreateScript()}
          >
            + Create script
          </button>
          <Link href="/dashboard/delivery">Delivery analytics →</Link>
        </div>
      </header>
      <nav
        className="vs-library-toolbar"
        aria-label="Voice library collections"
      >
        {[
          ["all", "My Scripts"],
          ["draft", "Drafts"],
          ["approved", "Approved"],
          ["archived", "Archived"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
          >
            {label} (
            {
              assets.filter((a) =>
                value === "archived"
                  ? a.studio_metadata?.archived
                  : !a.studio_metadata?.archived &&
                    (value === "approved"
                      ? a.approved
                      : value === "draft"
                        ? !a.approved
                        : true),
              ).length
            }
            )
          </button>
        ))}
        <button onClick={() => onCreateScript()}>AI Assistant</button>
      </nav>
      {notice && (
        <p role="status" className="vs-alert">
          {notice}
        </p>
      )}
      {error && (
        <div className="vs-alert" role="alert">
          Recordings could not be loaded.
          <button onClick={() => void refresh()}>Retry</button>
        </div>
      )}
      <div className="vs-layout">
        <aside className="vs-column">
          <section className="vs-card">
            <h3>Script library</h3>
            <p>Search and manage your recordings.</p>
            <label>
              <span className="vs-visually-hidden">Search scripts</span>
              <input
                type="search"
                placeholder="Search scripts…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label>
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {SCRIPT_FOLDERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="vs-library">
              {loading ? (
                <p>Loading recordings…</p>
              ) : !filtered.length ? (
                <p>
                  No recordings match this view. Create a script or adjust your
                  filters.
                </p>
              ) : (
                filtered.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    aria-pressed={selected?.id === a.id}
                    className="vs-library-item"
                    onClick={() => setSelectedId(a.id)}
                  >
                    <Image
                      src="/brand/heroes/voice-scripts-hero.png"
                      alt=""
                      width={48}
                      height={48}
                    />
                    <span>
                      <strong>{a.title}</strong>
                      <small>
                        {scriptCategory(a.title)} ·{" "}
                        {a.approved ? "Approved" : "Draft"}
                      </small>
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>
        <main className="vs-column">
          <section className="vs-card">
            {selected ? (
              <>
                <div className="vs-titlebar">
                  <h2 style={{ fontSize: 26 }}>{selected.title}</h2>
                  <span className="vs-status">
                    {selected.approved ? "Approved" : "Draft"}
                  </span>
                </div>
                <p>
                  {scriptCategory(selected.title)} · Created{" "}
                  {new Date(selected.created_at).toLocaleDateString()} ·{" "}
                  {selected.studio_metadata?.source === "ai"
                    ? "AI audio"
                    : selected.studio_metadata?.source === "human"
                      ? "Human recording"
                      : "Uploaded recording"}
                </p>
                <nav className="vs-library-toolbar">
                  {[
                    "Record & edit",
                    "Script text",
                    "Details",
                    "AI insights",
                  ].map((t) => (
                    <button
                      key={t}
                      aria-pressed={tab === t}
                      onClick={() => setTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </nav>
                {(tab === "Record & edit" || tab === "Script text") && (
                  <>
                    {tab === "Record & edit" && (
                      <div className="vs-audio">
                        {selected.playbackUrl && (
                          <AudioWaveform url={selected.playbackUrl} />
                        )}{" "}
                        {selected.playbackUrl ? (
                          <audio
                            key={selected.id}
                            controls
                            src={selected.playbackUrl}
                            onLoadedMetadata={(e) =>
                              setDuration(
                                Number.isFinite(e.currentTarget.duration)
                                  ? e.currentTarget.duration
                                  : null,
                              )
                            }
                          />
                        ) : (
                          <p>
                            Audio playback is unavailable. Retry loading your
                            library.
                          </p>
                        )}
                        <small>
                          {duration === null
                            ? "Duration not measured"
                            : `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")} measured audio duration`}
                        </small>
                      </div>
                    )}
                    <div className="vs-actions">
                      <button onClick={() => onCreateScript(selected)}>
                        Record or edit draft
                      </button>
                      <TestVoiceScript
                        asset={selected}
                        script={selected.studio_metadata?.script ?? ""}
                      />
                    </div>
                    <h3 style={{ marginTop: 20 }}>Script</h3>
                    <p className="vs-script-preview">
                      {selected.studio_metadata?.script ||
                        "No script text is stored for this recording. This audio has no verified transcript."}
                    </p>
                    <p>
                      Stored script text is not automatically a verified audio
                      transcript.
                    </p>
                  </>
                )}
                {tab === "Details" && (
                  <dl>
                    <dt>Recording version</dt>
                    <dd>{selected.id}</dd>
                    <dt>Approval</dt>
                    <dd>
                      {selected.studio_metadata?.approvedAt
                        ? new Date(
                            selected.studio_metadata.approvedAt,
                          ).toLocaleString()
                        : selected.approved
                          ? "Legacy approval; timestamp not recorded"
                          : "Not approved"}
                    </dd>
                    <dt>Owner</dt>
                    <dd>Your authenticated account</dd>
                  </dl>
                )}
                {tab === "AI insights" && (
                  <>
                    <p>No generated analysis is stored for this recording.</p>
                    <button onClick={() => onCreateScript(selected)}>
                      Review an AI writing suggestion
                    </button>
                  </>
                )}
                <div className="vs-actions" style={{ marginTop: 16 }}>
                  <button
                    onClick={() =>
                      onCreateScript({
                        ...selected,
                        id: "",
                        title: `${selected.title} copy`,
                      })
                    }
                  >
                    Duplicate as script draft
                  </button>
                  <button onClick={() => void archive()}>
                    {selected.studio_metadata?.archived
                      ? "Restore recording"
                      : "Archive recording"}
                  </button>
                </div>
              </>
            ) : (
              <div>
                <h2>Your next conversation starts here.</h2>
                <p>
                  Create a script, record your voice or upload an existing
                  recording.
                </p>
                <button onClick={() => onCreateScript()}>Create script</button>
              </div>
            )}
          </section>
        </main>
        <aside className="vs-column">
          <section className="vs-card">
            <h3>
              <Icon name="auto_awesome" /> AI Script Assistant
            </h3>
            <p>
              Write, improve, shorten or translate a script. Review all proposed
              changes before applying.
            </p>
            <button
              className="vs-primary"
              onClick={() => onCreateScript(selected ?? undefined)}
            >
              Open AI writing studio
            </button>
          </section>
          <section className="vs-card">
            <h3>Campaign assignment</h3>
            <p>
              Select an exact voicemail step and approved recording version in
              the studio. Selecting a campaign does not change it.
            </p>
            <button onClick={() => onCreateScript(selected ?? undefined)}>
              Review campaign assignment
            </button>
          </section>
          <section className="vs-card">
            <h3>Personalization & readiness</h3>
            {voiceChecks(selected, selected?.studio_metadata?.script ?? "")
              .slice(0, 4)
              .map((c) => (
                <div className="vs-check" key={c.label}>
                  <strong>{c.label}</strong>
                  <span data-status={c.status}>{c.status}</span>
                  <p>{c.detail}</p>
                </div>
              ))}
          </section>
          <section className="vs-card">
            <h3>Performance</h3>
            <p>
              Provider acceptance is distinct from confirmed delivery. Review
              actual sent, delivered, failed and attributable reply events in
              Delivery Audit.
            </p>
            <Link href="/dashboard/delivery">
              View verified delivery evidence →
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
