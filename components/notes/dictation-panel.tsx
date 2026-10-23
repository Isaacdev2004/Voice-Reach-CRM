"use client";
import { useEffect, useRef, useState } from "react";
import { notesRequest } from "./use-notes-workspace";
import { Icon } from "@/components/ui/icon";
type SpeechResult = {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
};
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    ((e: { resultIndex: number; results: SpeechResult[] }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
export function DictationPanel({
  onSave,
  onSummarize,
}: {
  onSave: (
    text: string,
    original: string,
    source: "dictation" | "upload" | "typed",
  ) => void;
  onSummarize: (text: string) => void;
}) {
  const [supported, setSupported] = useState(false),
    [recording, setRecording] = useState(false),
    [text, setText] = useState(""),
    [interim, setInterim] = useState(""),
    [original, setOriginal] = useState(""),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [source, setSource] = useState<"dictation" | "upload" | "typed">("typed"),
    [uncertain, setUncertain] = useState<string[]>([]);
  const recognition = useRef<Recognition | null>(null),
    live = useRef(true),
    base = useRef("");
  useEffect(() => {
    live.current = true;
    const w = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => {
      live.current = false;
      recognition.current?.abort();
    };
  }, []);
  function start() {
    setError("");
    const w = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) return;
    const r = new Constructor();
    recognition.current = r;
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || "en-US";
    base.current = text;
    const originalBase = original || text;
    let final = "";
    r.onresult = (e) => {
      if (!live.current) return;
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript + " ";
          if (
            e.results[i][0].confidence > 0 &&
            e.results[i][0].confidence < 0.65
          )
            setUncertain((rows) => [...rows, e.results[i][0].transcript]);
        } else pending += e.results[i][0].transcript;
      }
      const raw = [base.current, final.trim()].filter(Boolean).join("\n");
      setText(raw);
      setOriginal([originalBase, final.trim()].filter(Boolean).join("\n"));
      setInterim(pending);
      setSource("dictation");
    };
    r.onerror = (e) => {
      if (live.current) {
        setError(
          e.error === "not-allowed"
            ? "Microphone permission was denied. Enable it in your browser or type a recap."
            : e.error === "no-speech"
              ? "No clear speech was detected. Try again or type a recap."
              : "Dictation stopped. Your captured text is still editable.",
        );
        setRecording(false);
        r.abort();
      }
    };
    r.onend = () => {
      if (live.current) {
        setRecording(false);
        setInterim("");
      }
    };
    try {
      r.start();
      setRecording(true);
    } catch {
      setError("Microphone could not start. Check browser permissions.");
    }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    if (!consent) {
      setError("Confirm recording authorization first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("audio", file);
      form.set("consent", "confirmed");
      const data = await notesRequest<{
        transcript: string;
        segments: { text: string; uncertain: boolean; start: number }[];
      }>("/api/notes/transcribe", { method: "POST", body: form });
      setText(data.transcript);
      setOriginal(data.transcript);
      setSource("upload");
      setUncertain(
        data.segments
          .filter((s) => s.uncertain)
          .map((s) => `${Math.floor(s.start)}s: ${s.text}`),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to transcribe.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="notes-dictation">
      <h3>Dictate or capture a call recap</h3>
      <p>
        Recording starts only when you choose Start. Browser speech recognition
        may process audio through your browser provider. MyARI does not store
        the audio. Saved transcripts and their versions remain until the note is
        deleted; unsaved recovery drafts are available on this browser for up to
        7 days.
      </p>
      <div className="notes-actions">
        <button
          aria-label="Start dictation"
          disabled={!supported || recording || busy}
          onClick={start}
        >
          <Icon name="mic" />
          Start dictation
        </button>
        <button
          disabled={!recording}
          onClick={() => recognition.current?.stop()}
        >
          Stop
        </button>
        <button
          disabled={!recording}
          onClick={() => recognition.current?.stop()}
        >
          Pause
        </button>
        <button disabled={!supported || recording || !text} onClick={start}>
          Resume
        </button>
      </div>
      {!supported && (
        <p>
          Live dictation is unavailable in this browser. Type a recap or upload
          authorized audio.
        </p>
      )}
      <label className="notes-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />{" "}
        I am authorized to process this recording and have obtained all required
        consent from participants, including all-party consent where required.
      </label>
      <label className="notes-upload">
        Upload authorized audio
        <input
          aria-label="Upload authorized audio"
          disabled={!consent || busy || recording}
          type="file"
          accept="audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg"
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <p>
        Up to 20 MB. Uploads are sent to OpenAI for transcription only when
        configured. MyARI does not retain uploaded audio; provider retention
        policies apply. Existing outbound voicemail assets are not assumed to be
        recorded calls.
      </p>
      <label>
        Editable transcript
        <textarea
          aria-label="Editable transcript"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
        />
      </label>
      {interim && <p aria-live="polite">Listening: {interim}</p>}
      {recording && <p role="status">Microphone active</p>}
      {busy && <p role="status">Transcribing…</p>}
      {uncertain.length > 0 && (
        <div>
          <strong>Review uncertain passages</strong>
          {uncertain.map((s, i) => (
            <p key={i}>{s}</p>
          ))}
        </div>
      )}
      <p>
        Check names, addresses, dates, and amounts. AI cleanup is optional and
        never replaces the original transcript.
      </p>
      {error && <p role="alert">{error}</p>}
      {original && (
        <details>
          <summary>Original transcript</summary>
          <pre>{original}</pre>
        </details>
      )}
      <div className="notes-actions">
        <button
          className="notes-primary"
          disabled={!text.trim() || recording || busy}
          onClick={() => onSave(text, original || text, source)}
        >
          Save Transcript
        </button>
        <button
          disabled={!text.trim() || recording || busy}
          onClick={() => onSummarize(text)}
        >
          Summarize &amp; Suggest Actions
        </button>
      </div>
    </section>
  );
}
