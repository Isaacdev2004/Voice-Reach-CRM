"use client";
import { useEffect, useState } from "react";
/** Peaks are decoded from the selected authorized audio, never generated decoration. */
export function AudioWaveform({ url }: { url: string }) {
  const [peaks, setPeaks] = useState<number[] | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    let live = true,
      context: AudioContext | null = null;
    setPeaks(null);
    void (async () => {
      try {
        if (!window.AudioContext) return;
        const r = await fetch(url, { signal: abort.signal });
        if (!r.ok || Number(r.headers.get("content-length")) > 25 * 1024 * 1024)
          return;
        const buffer = await r.arrayBuffer();
        if (buffer.byteLength > 25 * 1024 * 1024 || !live) return;
        context = new AudioContext();
        const decoded = await context.decodeAudioData(buffer);
        if (!live) return;
        const channel = decoded.getChannelData(0),
          step = Math.max(1, Math.floor(channel.length / 72));
        const bars = Array.from({ length: 72 }, (_, i) => {
          let peak = 0;
          for (
            let j = i * step;
            j < Math.min(channel.length, (i + 1) * step);
            j++
          )
            peak = Math.max(peak, Math.abs(channel[j]));
          return peak;
        });
        setPeaks(bars);
      } catch {
        /* Native playback remains usable when browser decoding is unavailable. */
      } finally {
        void context?.close().catch(() => undefined);
      }
    })();
    return () => {
      live = false;
      abort.abort();
      void context?.close().catch(() => undefined);
    };
  }, [url]);
  return peaks ? (
    <svg
      viewBox="0 0 432 54"
      preserveAspectRatio="none"
      role="img"
      aria-label="Waveform decoded from selected recording"
      style={{ width: "100%", height: 54 }}
    >
      {peaks.map((p, i) => (
        <rect
          key={i}
          x={i * 6 + 1}
          y={27 - Math.max(1, p * 25)}
          width={3}
          height={Math.max(2, p * 50)}
          rx={1.5}
          fill={i < 36 ? "#a77b58" : "#d7c2ac"}
        />
      ))}
    </svg>
  ) : (
    <p className="vs-status">
      Waveform unavailable until audio can be decoded. Use the player to listen.
    </p>
  );
}
