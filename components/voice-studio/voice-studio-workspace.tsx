"use client";
import { useAssistantRecord } from "@/components/assistant/use-record-context";
import { RecordingTranscript } from "./recording-transcript";
import { useVoiceDrafts } from "@/lib/voice-studio/use-voice-drafts";
import { AudioWaveform } from "@/components/voice-studio/audio-waveform";

import { useUser } from "@clerk/nextjs";
import { TestVoiceScript } from "./test-voice-script";
import { voiceChecks, validateAudio } from "@/lib/voice-studio/verification";
import "./voice-studio.css";
import {
  Modal,
  ModalField,
  ModalFooterActions,
  modalInputClass,
} from "@/components/crm/modal";
import { VoiceCloningStrip } from "@/components/crm/voice-cloning-strip";
import { AppToast } from "@/components/ui/app-toast";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { isUuid } from "@/lib/contacts/is-uuid";
import { useCampaignOptions } from "@/lib/hooks/use-campaign-options";
import { useVoiceAssets, type VoiceAsset } from "@/lib/hooks/use-voice-assets";
import {
  formatDuration,
  removeLocalRecording,
  type LocalRecording,
} from "@/lib/voice-studio/storage";
import { uploadVoiceRecording } from "@/lib/voice-studio/upload";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type RecState = "idle" | "recording" | "paused";

type Toast = { message: string; tone: "success" | "error" };

export function VoiceStudioWorkspace({
  initialAsset,
}: {
  initialAsset?: VoiceAsset;
}) {
  const { user } = useUser();
  const { assets, loading, error, refresh, approve, assignToCampaign, remove } =
    useVoiceAssets();
  const { options: campaigns, loading: campaignsLoading } =
    useCampaignOptions();

  const draftController = useVoiceDrafts(user?.id,initialAsset?{title:initialAsset.title,script:initialAsset.studio_metadata?.script,scriptId:isUuid(initialAsset.script_id)?initialAsset.script_id:undefined}:undefined);
  const {draft,drafts,phase,cloudError,localError}=draftController;
  const scriptText=draft.script,title=draft.title,draftId=draft.id;
  const setScriptText=(script:string)=>draftController.edit({script});
  const setTitle=(title:string)=>draftController.edit({title});
  const savingDraft=phase==="saving";
  const [libraryOpen,setLibraryOpen]=useState(false);
  const [contextTab,setContextTab]=useState<"ai"|"voice">("ai");
  const [campaignId, setCampaignId] = useState("");
  const [recState, setRecState] = useState<RecState>("idle");
  const [elapsed, setElapsed] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    remote: boolean;
    url?: string | null;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [stepId, setStepId] = useState("");
  const [steps, setSteps] = useState<
    {
      id: string;
      type: string;
      step_order: number;
      voice_asset_id?: string;
      conditions?: { voiceAssetId?: string };
    }[]
  >([]);
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState(0);
  const [measured, setMeasured] = useState<number | null>(null);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiProposal, setAiProposal] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [capabilities,setCapabilities]=useState<{writingConfigured:boolean;transcriptionConfigured:boolean}|null>(null);
  const aiBase=useRef<{id:string;script:string}|null>(null);
  const draftSnapshot=useRef(draft);draftSnapshot.current=draft;
  const [pendingScript,setPendingScript]=useState("");
  const recordingScript=useRef("");
  const recordingDraftId=useRef("");
  useEffect(()=>{const controller=new AbortController();fetch("/api/voice-studio/capabilities",{cache:"no-store",signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok || data.success!==true)throw Error();if(!controller.signal.aborted)setCapabilities({writingConfigured:data.writingConfigured===true,transcriptionConfigured:data.transcriptionConfigured===true});}).catch(()=>{});return()=>controller.abort();},[]);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const selected = assets.find((a) => a.id === activeAssetId) ?? null;
  const selectedCampaign = campaigns.find((c) => c.id === campaignId);
  const selectedStep = steps.find((s) => s.id === stepId);
  const saveDraft = () => draftController.save();
  const reviewAi = async () => {
    const snapshot={id:draftId,script:scriptText};aiBase.current=snapshot;
    setAiBusy(true);
    setAiProposal("");
    try {
      const r = await fetch("/api/voice-studio/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: scriptText,
          instruction: aiInstruction,
        }),
      });
      const j = await r.json();
      if (!r.ok || j.success!==true || typeof j.script!=="string" || !j.script.trim() || j.script.length>5000) throw new Error();
      if(draftSnapshot.current.id!==snapshot.id)return;
      setAiProposal(j.script);
    } catch {
      showToast(
        "AI writing is unavailable. Your script has not changed.",
        "error",
      );
    } finally {
      setAiBusy(false);
    }
  };
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, tone: Toast["tone"] = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    setActiveAssetId(initialAsset?.id || null);
    setCampaignId("");
  }, [initialAsset]);
  useEffect(() => {
    let cancelled = false;
    setSteps([]);
    setStepId("");
    if (!campaignId) return;
    void fetch(`/api/campaigns/${campaignId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((j) => {
        if (!cancelled)
          setSteps(
            (j.steps ?? []).filter(
              (x: { type: string }) => x.type === "voicemail",
            ),
          );
      })
      .catch(() => {
        if (!cancelled) showToast("Could not load campaign steps.", "error");
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);
  useEffect(
    () => () => {
      const recorder = mediaRecorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioRef.current?.pause();
    },
    [],
  );
  useEffect(() => {
    if (recState !== "recording") return;
    const id = window.setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    timerRef.current = id;
    return () => {
      window.clearInterval(id);
      timerRef.current = null;
    };
  }, [recState]);

  useEffect(()=>{
    if(!pendingBlob && recState==="idle")return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    const guard=(event:MouseEvent)=>{const link=(event.target as Element)?.closest?.("a[href]") as HTMLAnchorElement|null;if(!link || link.target==="_blank" || event.ctrlKey || event.metaKey)return;const next=new URL(link.href,location.href);if(next.pathname===location.pathname && next.origin===location.origin)return;if(!window.confirm("This recording has not been saved. Download or save it before leaving. Leave anyway?")){event.preventDefault();event.stopPropagation();}};
    window.addEventListener("beforeunload",warn);document.addEventListener("click",guard,true);return()=>{window.removeEventListener("beforeunload",warn);document.removeEventListener("click",guard,true);};
  },[pendingBlob,recState]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    if (!consent) {
      showToast("Confirm you have permission to record this voice.", "error");
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      showToast(
        "Recording is not supported in this browser. Upload audio instead.",
        "error",
      );
      return;
    }
    try {
      recordingScript.current=scriptText;recordingDraftId.current=draftId;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      if (!mime) {
        stopStream();
        throw new Error("Unsupported recording format");
      }
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        setPendingBlob(blob);setPendingScript(recordingScript.current);
        setSaveTitle(`Recording ${new Date().toLocaleDateString()}`);
        setSaveOpen(true);
        stopStream();
      };
      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setElapsed(0);
      setRecState("recording");
      showToast("Recording started");
    } catch {
      stopStream();
      showToast("Microphone access denied or unavailable", "error");
    }
  };

  const pauseRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    if (recState === "recording") {
      rec.pause();
      setRecState("paused");
    } else if (recState === "paused") {
      rec.resume();
      setRecState("recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recState !== "idle") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setRecState("idle");
    }
  };

  const handleSaveRecording = async () => {
    if (!pendingBlob || !saveTitle.trim()) return;
    setUploading(true);
    const scriptId = recordingDraftId.current || draftId;
    try {
      const asset = await uploadVoiceRecording(
        pendingBlob,
        saveTitle.trim(),
        scriptId,
      );
      setActiveAssetId(asset.id);
      const detailsSaved = await fetch(`/api/voice-assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioMetadata: { script: pendingScript, source: "human" },
        }),
      })
        .then(async r => {const data=await r.json();return r.ok && data.success===true && data.voiceAsset?.id===asset.id && data.voiceAsset?.studio_metadata?.script===pendingScript;})
        .catch(() => false);
      await refresh();
      showToast(
        detailsSaved
          ? "Recording saved and uploaded"
          : "Audio uploaded, but its script details could not be saved. Save your script draft separately.",
        detailsSaved ? "success" : "error",
      );
      setSaveOpen(false);
      setPendingBlob(null);
    } catch {
      showToast(
        "Upload failed. Your recording is retained here; retry saving or download a copy before leaving.",
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async (file: File) => {
    const invalid = validateAudio(file.type, file.size);
    if (invalid) {
      showToast(invalid, "error");
      return;
    }
    setUploading(true);
    const title = file.name.replace(/\.[^.]+$/, "");
    const scriptId = draftId || "studio-default";
    try {
      const asset = await uploadVoiceRecording(file, title, scriptId);
      setActiveAssetId(asset.id);
      await refresh();
      showToast(`Imported ${file.name}`);
    } catch {
      showToast(
        "Upload failed. Your original file is unchanged. Please retry.",
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCampaignChange = async (id: string) => {
    setCampaignId(id);
  };

  const handleApprove = async (asset: VoiceAsset) => {
    try {
      await approve(asset.id);
      showToast(`"${asset.title}" approved`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Approval failed", "error");
    }
  };

  const handleUseForCampaign = async (asset: VoiceAsset) => {
    if (!campaignId || !isUuid(campaignId)) {
      showToast("Select a real campaign in Assign to campaign first.", "error");
      return;
    }
    if (!asset.approved) {
      showToast(
        "Listen to and approve the recording before assignment.",
        "error",
      );
      return;
    }
    if (!stepId) {
      showToast("Select the exact voicemail step.", "error");
      return;
    }
    if (
      !window.confirm(
        `Assign “${asset.title}” to ${selectedCampaign?.name}, step ${(selectedStep?.step_order ?? 0) + 1}? This replaces any recording already assigned to that step. Live schedules will not be changed.`,
      )
    )
      return;
    try {
      const result = await assignToCampaign(asset.id, campaignId, stepId);
      showToast(result.link?.message ?? "Recording assigned.");
    } catch {
      showToast(
        "Could not assign recording. Reload the campaign and try again.",
        "error",
      );
    }
  };

  const confirmDelete = async () => {
    const item = deleteTarget;
    if (!item) return;

    if (playingId === item.id && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingId(null);
    }

    if (!item.remote) {
      if (item.url?.startsWith("blob:")) URL.revokeObjectURL(item.url);
      removeLocalRecording(item.id);
      setDeleteTarget(null);
      showToast("Local recording deleted");
      return;
    }

    setDeleting(true);
    try {
      await remove(item.id);
      if (activeAssetId === item.id) setActiveAssetId(null);
      setDeleteTarget(null);
      showToast("Recording deleted");
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Could not delete recording",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  const displayTime = formatDuration(elapsed);
  const filteredAssets = assets.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) &&
      (status === "all" ||
        (status === "approved" ? a.approved : !a.approved)) &&
      !a.studio_metadata?.archived,
  );
  return (
    <div className="vs-workspace" data-library-open={libraryOpen} data-protect-leave={Boolean((localError && phase!=="saved") || pendingBlob || recState!=="idle")}>
      {toast && <AppToast message={toast.message} tone={toast.tone} />}
      <header className="vs-heading">
        <div>
          <h2>Create voice script</h2>
          <p>
            Write, record or generate audio, then review and assign to a
            campaign.
          </p>
        </div>
        <div className="vs-actions">
          <button type="button" aria-expanded={libraryOpen} aria-controls="vs-library-panel" onClick={()=>setLibraryOpen(value=>!value)}>{libraryOpen?"Hide library":"Show library"}</button>
          <button type="button" onClick={()=>{const blob=new Blob([`${title}\n\n${scriptText}`],{type:"text/plain"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="myari-voice-script.txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Download draft</button>
          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={savingDraft || !title.trim() || phase==="loading" || phase==="conflict"}
          >
            {savingDraft ? "Saving…" : "Save draft"}
          </button>
          <TestVoiceScript
            asset={selected}
            script={selected?.studio_metadata?.script ?? scriptText}
            campaignName={selectedCampaign?.name}
            stepName={
              selectedStep ? `Step ${selectedStep.step_order + 1}` : undefined
            }
          />
        </div>
      </header>
      <div className="vs-save-state" role="status" aria-live="polite">{phase==="saved"?"Script draft saved to cloud.":phase==="saving"?"Saving draft…":phase==="loading"?"Checking cloud drafts…":phase==="conflict"?"Draft conflict — your edits are preserved.":phase==="failed"?"Cloud save failed — retry or download your draft.":"Unsaved changes · autosave pending"}</div>
      <nav className="vs-steps" aria-label="Script workflow">
        {[
          "Write script",
          "Record or generate",
          "Preview & edit",
          "Approve",
          "Assign to campaign",
        ].map((label, i) => (
          <button
            key={label}
            type="button"
            aria-current={stage === i ? "step" : undefined}
            onClick={() => {
              setStage(i);
              document
                .getElementById(`vs-stage-${i}`)
                ?.scrollIntoView({ block: "nearest", behavior: "auto" });
            }}
          >
            <b>{i + 1}</b>
            {label}
          </button>
        ))}
      </nav>
      {cloudError && (
        <div role="status" className="vs-alert">
          {cloudError}
          <div className="vs-actions"><button type="button" onClick={()=>void draftController.loadDrafts()}>Retry cloud library</button><button type="button" disabled={savingDraft} onClick={()=>draftController.newDraft(true)}>Save as new draft</button>{phase==="conflict"?<button type="button" onClick={()=>void draftController.reloadCloud()}>Reload cloud version</button>:null}</div>
        </div>
      )}
      {localError?<p role="alert" className="vs-alert">{localError}</p>:null}
      <div className="vs-layout">
        <aside className="vs-column vs-library-column" id="vs-library-panel" hidden={!libraryOpen}>
          <section className="vs-card">
            <div className="vs-titlebar">
              <h3>Script library</h3>
              <button
                type="button"
                onClick={() => {
                  draftController.newDraft();
                }}
              >
                + New
              </button>
            </div>
            <label>
              <span className="vs-visually-hidden">Search scripts</span>
              <input
                type="search"
                placeholder="Search scripts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="vs-library-toolbar">
              {["all", "draft", "approved"].map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                >
                  {s === "all" ? "All" : s === "draft" ? "Drafts" : "Approved"}
                </button>
              ))}
            </div>
            {loading && <p>Loading recordings…</p>}
            {error && (
              <p role="alert">
                Recordings could not be loaded.{" "}
                <button onClick={() => void refresh()}>Retry</button>
              </p>
            )}
            <div className="vs-library">
              {status !== "approved" &&
                drafts
                  .filter(
                    (d) =>
                      !d.archived &&
                      d.title.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((d) => (
                    <button
                      type="button"
                      key={d.id}
                      className="vs-library-item"
                      aria-pressed={draftId === d.id && !activeAssetId}
                      onClick={() => {
                        draftController.select(d);
                        setActiveAssetId(null);
                      }}
                    >
                      <Icon name="description" />
                      <span>
                        <strong>{d.title || "Untitled recovery draft"}</strong>
                        <small>{d.recovery?"Device recovery draft":"Cloud script draft"} · no recording</small>
                      </span>
                    </button>
                  ))}
              {filteredAssets.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  className="vs-library-item"
                  aria-pressed={activeAssetId === a.id}
                  onClick={() => {
                    setActiveAssetId(a.id);
                    const related=drafts.find(d=>d.id===a.script_id);
                    if(related)draftController.select(related);
                    else{draftController.newDraft();draftController.edit({title:a.title,script:a.studio_metadata?.script ?? ""});}
                    setMeasured(null);
                  }}
                >
                  <Icon name="graphic_eq" />
                  <span>
                    <strong>{a.title}</strong>
                    <small>
                      {a.approved ? "Approved recording" : "Draft recording"} ·{" "}
                      {a.studio_metadata?.source === "ai"
                        ? "AI"
                        : a.studio_metadata?.source === "human"
                          ? "Human"
                          : "Uploaded audio"}
                    </small>
                  </span>
                </button>
              ))}
              {!loading && !filteredAssets.length && !drafts.length && (
                <p>Your library is ready for its first script.</p>
              )}
            </div>
          </section>
        </aside>
        <main className="vs-column">
          <section className="vs-card" id="vs-stage-0">
            <label>
              Script title
              <input
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label htmlFor="vs-script">Script text</label>
            <div className="vs-editor-tools">
              {[
                "Improve tone",
                "Shorten",
                "Translate",
                "Personalize",
                "Optimize duration",
                "Spoken-friendly wording",
              ].map((a) => (
                <button
                  type="button"
                  key={a}
                  disabled={aiBusy || !capabilities?.writingConfigured || !scriptText.trim()}
                  onClick={() => {
                    setAiInstruction(a === "Translate" ? "Translate into [choose target language] while preserving facts." : a === "Personalize" ? "Personalize using [provide authorized client details]; keep unknown details as placeholders." : a);
                    setContextTab("ai");requestAnimationFrame(()=>document.getElementById("vs-ai")?.focus());
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
            <textarea
              id="vs-script"
              ref={editorRef}
              rows={6}
              maxLength={5000}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="Write your script…"
            />
            <div className="vs-titlebar">
              <small>
                {scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0}{" "}
                words · text estimate{" "}
                {formatDuration(
                  Math.ceil(scriptText.trim().split(/\s+/).length / 2.5),
                )}
              </small>
              <select
                aria-label="Insert variable"
                value=""
                onChange={(e) => {
                  const el = editorRef.current;
                  const n = el?.selectionStart ?? scriptText.length;
                  const next=scriptText.slice(0,n)+e.target.value+scriptText.slice(n);
                  if(next.length>5000){showToast("Scripts can contain up to 5,000 characters. Shorten the draft before inserting a variable.","error");return;}
                  setScriptText(next);
                  el?.focus();
                }}
              >
                <option value="">Insert variable</option>
                {["[FirstName]", "[Agent]", "[Brokerage]", "[City]"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
            </div>
            <p>
              Edits are a script draft. They never replace previously approved
              audio.
            </p>
          </section>
          <section className="vs-card" id="vs-stage-1">
            <h3>Audio studio</h3>
            <label>
              <span>
                <input
                  style={{ width: "auto" }}
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />{" "}
                I have permission to record this voice.
              </span>
            </label>
            <div className="vs-audio">
              {selected?.playbackUrl && (
                <AudioWaveform url={selected.playbackUrl} />
              )}
              <strong>
                {recState === "idle"
                  ? "Ready to record"
                  : recState === "paused"
                    ? "Recording paused"
                    : "Recording"}
              </strong>{" "}
              · {displayTime}
              {selected?.playbackUrl && (
                <audio
                  key={selected.id}
                  controls
                  src={selected.playbackUrl}
                  onLoadedMetadata={(e) =>
                    setMeasured(
                      Number.isFinite(e.currentTarget.duration)
                        ? e.currentTarget.duration
                        : null,
                    )
                  }
                />
              )}
              <p>
                {measured !== null
                  ? `Measured duration ${formatDuration(measured)}`
                  : "Select a recording to measure its duration."}
              </p>
            </div>
            {pendingBlob && !saveOpen?<div className="vs-unsaved-audio"><p>Your unsaved recording is retained on this page.</p><div className="vs-actions"><button type="button" onClick={()=>setSaveOpen(true)}>Retry save recording</button><button type="button" onClick={()=>{const url=URL.createObjectURL(pendingBlob);const a=document.createElement("a");a.href=url;a.download=`myari-recording.${pendingBlob.type.includes("mp4")?"m4a":pendingBlob.type.includes("ogg")?"ogg":"webm"}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Download recording</button><button type="button" onClick={()=>{if(window.confirm("Discard this unsaved recording?"))setPendingBlob(null);}}>Discard recording</button></div></div>:null}
            <div className="vs-record-controls">
              <button
                type="button"
                className="vs-primary"
                disabled={uploading || Boolean(pendingBlob) || (!consent && recState === "idle")}
                onClick={() =>
                  void (recState === "idle"
                    ? startRecording()
                    : stopRecording())
                }
              >
                {recState === "idle" ? "Start recording" : "Stop recording"}
              </button>
              <button
                type="button"
                disabled={recState === "idle"}
                onClick={pauseRecording}
              >
                {recState === "paused" ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => importRef.current?.click()}
              >
                Upload audio
              </button>
              <input
                ref={importRef}
                type="file"
                className="vs-visually-hidden"
                accept="audio/wav,audio/mpeg,audio/webm,audio/mp4,audio/ogg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImport(file);
                  e.target.value = "";
                }}
              />
            </div>
            <p>
              WAV, MP3, WebM, M4A or Ogg · maximum 25 MB. Each upload creates a
              separate recording version.
            </p>
          </section>
          {selected?<RecordingTranscript key={selected.id} asset={selected} available={capabilities?.transcriptionConfigured ?? null}/>:null}
          <section className="vs-card" id="vs-stage-2">
            <h3>Recording versions</h3>
            {assets
              .filter((a) => a.script_id === draftId || Boolean(selected && a.script_id === selected.script_id))
              .map((a) => (
                <div key={a.id} className="vs-titlebar">
                  <span>
                    {a.title} <small>{a.approved ? "Approved" : "Draft"}</small>
                  </span>
                  <button type="button" onClick={() => {setActiveAssetId(a.id);setMeasured(null);}}>
                    Select
                  </button>
                </div>
              ))}
            {selected && (
              <>
                <TestVoiceScript
                  asset={selected}
                  script={selected.studio_metadata?.script ?? ""}
                  campaignName={selectedCampaign?.name}
                />
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget({
                      id: selected.id,
                      title: selected.title,
                      remote: true,
                      url: selected.playbackUrl,
                    })
                  }
                >
                  Delete recording
                </button>
              </>
            )}
          </section>
        </main>
        <aside className="vs-column">
          <section className="vs-card vs-context-panel">
            <nav className="vs-context-tabs" aria-label="Writing and voice tools"><button type="button" aria-pressed={contextTab==="ai"} onClick={()=>setContextTab("ai")}>AI writing</button><button type="button" aria-pressed={contextTab==="voice"} onClick={()=>setContextTab("voice")}>Voice settings</button></nav>
            <div hidden={contextTab!=="ai"}>
            <h3>AI Script Assistant</h3>
            <p>
              Create, refine and optimize your script. Review every suggestion
              before applying.
            </p>
            {!capabilities?.writingConfigured?<p>{capabilities===null?"AI availability could not yet be verified. Reload to retry.":"AI writing is unavailable. Continue writing or recording; your work is preserved."}</p>:null}
            <div className="vs-quick-prompts">{["Re-engage a cold buyer lead without assuming recent contact.","Follow up after a showing; leave missing property details as placeholders.","Check in with a past client without inventing an anniversary.","Invite a seller to discuss their next steps without promises."].map(prompt=><button key={prompt} type="button" disabled={aiBusy} onClick={()=>setAiInstruction(prompt)}>{prompt.split(";")[0].split(" without")[0]}</button>)}</div>
            <textarea
              id="vs-ai"
              rows={3}
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              placeholder="Describe what you need…"
            />
            <button
              className="vs-primary"
              type="button"
              disabled={aiBusy || !capabilities?.writingConfigured || !aiInstruction.trim() || aiInstruction.includes("[choose target language]") || aiInstruction.includes("[provide authorized client details]")}
              onClick={() => void reviewAi()}
            >
              {aiBusy ? "Preparing suggestion…" : "Generate script"}
            </button>
            {aiProposal && (
              <>
                <h4>Review proposed text</h4>
                <textarea
                  aria-label="AI proposed script"
                  maxLength={5000}
                  rows={6}
                  value={aiProposal}
                  onChange={(e) => setAiProposal(e.target.value)}
                />
                <p>
                  Check names, phone numbers, addresses, prices and every
                  factual detail before applying.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if(aiBase.current?.id!==draftId){setAiProposal("");showToast("Select the original draft and generate a new suggestion.","error");return;}
                    if(aiBase.current?.script!==scriptText && !window.confirm("Your script changed after this suggestion was requested. Replace the current draft with the reviewed suggestion?"))return;
                    setScriptText(aiProposal);
                    setAiProposal("");
                  }}
                >
                  Apply to draft
                </button>
                <button type="button" onClick={() => setAiProposal("")}>
                  Discard
                </button>
              </>
            )}
            </div>
            <div hidden={contextTab!=="voice"}>
            <h3>Voice settings</h3>
            <VoiceCloningStrip
              embedded
              scriptText={scriptText}
              scriptId={draftId}
              assets={assets}
              onGenerated={asset => {if(asset)setActiveAssetId(asset.id);void refresh();}}
            />
            </div>
          </section>
          <section className="vs-card" id="vs-stage-4">
            <h3>Campaign assignment</h3>
            <label>
              Campaign
              <select
                aria-label="Campaign"
                value={campaignId}
                onChange={(e) => void handleCampaignChange(e.target.value)}
                disabled={campaignsLoading}
              >
                <option value="">Select campaign…</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Voicemail step
              <select
                aria-label="Voicemail step"
                value={stepId}
                onChange={(e) => setStepId(e.target.value)}
                disabled={!campaignId}
              >
                <option value="">Select voicemail step…</option>
                {steps.map((s) => (
                  <option value={s.id} key={s.id}>
                    Step {s.step_order + 1}
                    {s.voice_asset_id || s.conditions?.voiceAssetId
                      ? " · Recording assigned"
                      : " · No recording"}
                  </option>
                ))}
              </select>
            </label>
            {selectedStep && (selectedStep.voice_asset_id || selectedStep.conditions?.voiceAssetId)?<p>This step already has a recording. Assigning another version requires confirmation.</p>:null}
            {campaignId && !steps.length && (
              <p>
                No available voicemail steps. Open the campaign to review its
                sequence.
              </p>
            )}
            <label>Approved recording version<select aria-label="Approved recording version" value={selected?.approved?selected.id:""} onChange={event=>{setActiveAssetId(event.target.value);setMeasured(null);}}><option value="">Select approved version…</option>{assets.filter(asset=>asset.approved).map(asset=><option value={asset.id} key={asset.id}>{asset.title} · {new Date(asset.created_at).toLocaleDateString()}</option>)}</select></label>
            <TestVoiceScript
              asset={selected}
              script={selected?.studio_metadata?.script ?? ""}
              campaignName={selectedCampaign?.name}
              stepName={
                selectedStep ? `Step ${selectedStep.step_order + 1}` : undefined
              }
            />
            <button
              type="button"
              className="vs-primary"
              disabled={!selected?.approved || !stepId}
              onClick={() => selected && void handleUseForCampaign(selected)}
            >
              Assign to campaign
            </button>
            {campaignId && (
              <Link href={`/dashboard/campaigns/${campaignId}`}>
                Open full campaign
              </Link>
            )}
          </section>
          <section className="vs-card" id="vs-stage-3">
            <h3>Personalization & readiness</h3>
            {voiceChecks(
              selected,
              selected?.studio_metadata?.script ?? scriptText,
            )
              .slice(0, 4)
              .map((c) => (
                <div key={c.label} className="vs-check">
                  <strong>{c.label}</strong>
                  <span data-status={c.status}>{c.status}</span>
                  <p>{c.detail}</p>
                </div>
              ))}
            <button
              type="button"
              disabled={!selected || selected.approved}
              onClick={() => {
                if (
                  selected &&
                  window.confirm(
                    "I have listened to this recording and approve this exact audio version for campaign use.",
                  )
                )
                  void handleApprove(selected);
              }}
            >
              Approve recording version
            </button>
          </section>
        </aside>
      </div>
      <Modal
        open={saveOpen}
        onClose={() => {
          setSaveOpen(false);
        }}
        title="Save recording"
        description="Name your take before adding it to the library."
        icon="save"
        size="md"
        footer={
          <ModalFooterActions
            onCancel={() => {
              setSaveOpen(false);
            }}
            primaryLabel={uploading ? "Saving…" : "Save recording"}
            onPrimary={handleSaveRecording}
            primaryDisabled={uploading || !saveTitle.trim()}
            primaryLoading={uploading}
          />
        }
      >
        <ModalField label="Recording title" required>
          <input
            className={modalInputClass}
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            autoFocus
          />
        </ModalField>
        <p className="text-[13px] text-taupe">Duration: {displayTime}</p>
        {pendingBlob && (
          <button
            type="button"
            onClick={() => {
              const url = URL.createObjectURL(pendingBlob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `recording.${pendingBlob.type.includes("mp4") ? "m4a" : "webm"}`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Download a copy
          </button>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => (!deleting ? setDeleteTarget(null) : undefined)}
        title="Delete recording"
        description={
          deleteTarget
            ? `Delete “${deleteTarget.title}”? This cannot be undone.`
            : "Delete this recording?"
        }
        icon="delete"
        size="md"
        footer={
          <ModalFooterActions
            onCancel={() => setDeleteTarget(null)}
            primaryLabel={deleting ? "Deleting…" : "Delete permanently"}
            onPrimary={() => void confirmDelete()}
            primaryDisabled={deleting}
            primaryLoading={deleting}
          />
        }
      >
        <p className="text-[14px] leading-relaxed text-slate-text">
          The file will be removed from your library and cloud storage. Assigned
          recordings are protected and must be unlinked first.
        </p>
      </Modal>
    </div>
  );
}
