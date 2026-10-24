"use client";
import { useEffect, useRef, useState } from "react";
export function AssistantDictation({
  owner,
  onTranscript,
  onProcessing,
}: {
  owner: string;
  onTranscript: (text: string) => void;
  onProcessing?: (busy: boolean) => void;
}) {
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    active = useRef(true);
  const [recording, setRecording] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (
        recorder.current?.state === "recording" ||
        recorder.current?.state === "paused"
      )
        recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  async function start() {
    setError("");
    if (!consent) {
      setError("Confirm permission before recording.");
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Recording is unavailable in this browser. Type your command.");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (!active.current) {
        stream.current.getTracks().forEach((t) => t.stop());
        return;
      }
      const type = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      if (!type) throw Error();
      const r = new MediaRecorder(stream.current, { mimeType: type });
      recorder.current = r;
      const chunks: Blob[] = [];
      let bytes = 0;
      r.ondataavailable = (e) => {
        bytes += e.data.size;
        chunks.push(e.data);
        if (bytes > 8 * 1024 * 1024 && r.state === "recording") r.stop();
      };
      r.onstop = async () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        if (timer.current) clearTimeout(timer.current);
        if (!active.current) return;
        setRecording(false);
        setBusy(true);
        onProcessing?.(true);
        try {
          if (bytes > 8 * 1024 * 1024)
            throw Error("Recording exceeds 8 MB. Record a shorter command.");
          const context = new AudioContext();
          const decoded = await context.decodeAudioData(
            await new Blob(chunks, { type }).arrayBuffer(),
          );
          const pcm = decoded.getChannelData(0),
            wav = new ArrayBuffer(44 + pcm.length * 2),
            view = new DataView(wav);
          const ascii = (offset: number, text: string) => {
            for (let i = 0; i < text.length; i++)
              view.setUint8(offset + i, text.charCodeAt(i));
          };
          ascii(0, "RIFF");
          view.setUint32(4, 36 + pcm.length * 2, true);
          ascii(8, "WAVE");
          ascii(12, "fmt ");
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, 1, true);
          view.setUint32(24, decoded.sampleRate, true);
          view.setUint32(28, decoded.sampleRate * 2, true);
          view.setUint16(32, 2, true);
          view.setUint16(34, 16, true);
          ascii(36, "data");
          view.setUint32(40, pcm.length * 2, true);
          for (let i = 0; i < pcm.length; i++)
            view.setInt16(
              44 + i * 2,
              Math.max(-1, Math.min(1, pcm[i])) * 32767,
              true,
            );
          await context.close();
          const form = new FormData();
          form.set(
            "audio",
            new Blob([wav], { type: "audio/wav" }),
            "command.wav",
          );
          form.set("consent", "confirmed");
          const response = await fetch("/api/assistant/transcribe", {
            method: "POST",
            headers: { "X-MyARI-Owner": owner },
            body: form,
          });
          const data = await response.json();
          if (!response.ok)
            throw Error(data.error ?? "Transcription unavailable");
          if (active.current) onTranscript(data.transcript);
        } catch (e) {
          if (active.current)
            setError(
              e instanceof Error
                ? e.message
                : "Transcription failed. Type your command.",
            );
        } finally {
          if (active.current) setBusy(false);
          onProcessing?.(false);
        }
      };
      r.onerror = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        setRecording(false);
        onProcessing?.(false);
        setError(
          "Recording stopped unexpectedly. Type your command or record again.",
        );
      };
      r.start(500);
      setRecording(true);
      onProcessing?.(true);
      timer.current = setTimeout(
        () => r.state === "recording" && r.stop(),
        60000,
      );
    } catch {
      stream.current?.getTracks().forEach((t) => t.stop());
      onProcessing?.(false);
      setError(
        "Microphone permission or recording is unavailable. Type your command.",
      );
    }
  }
  return (
    <div className="assistant-dictation">
      <label>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={recording || busy}
        />
        I authorize microphone recording and transcription by OpenAI. API costs
        may apply.
      </label>
      <button
        disabled={busy || (!consent && !recording)}
        onClick={() => (recording ? recorder.current?.stop() : void start())}
      >
        {recording
          ? "Stop recording"
          : busy
            ? "Transcribing…"
            : "Microphone · dictate command"}
      </button>
      {recording && (
        <p role="status">
          Recording · maximum 60 seconds. Stop to prepare an editable
          transcript.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <p>
        Dictation only fills the command field. Review and submit it; voice
        never authorizes a save or send.
      </p>
    </div>
  );
}
