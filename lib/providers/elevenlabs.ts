const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

function elevenLabsApiKey(): string | null {
  const raw = process.env.ELEVENLABS_API_KEY?.trim();
  if (!raw) return null;
  // Common mistake: people paste the key *name/id* instead of the secret.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(raw) || (!raw.startsWith("sk_") && raw.length < 20)) {
    return raw; // still try; clearer error below if 401
  }
  return raw;
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(elevenLabsApiKey());
}

export function defaultElevenLabsVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
}

export function configuredEnvVoice(): { voiceId: string; label: string } | null {
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (!voiceId) return null;
  return { voiceId, label: process.env.ELEVENLABS_VOICE_LABEL?.trim() || "My voice" };
}

export async function resolveOwnerVoiceId(
  ownerId: string,
  options?: { voiceProfileId?: string; voiceId?: string },
): Promise<string> {
  if (options?.voiceId?.trim()) return options.voiceId.trim();

  if (options?.voiceProfileId) {
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const { data: profile } = await supabaseAdmin
      .from("voice_profiles")
      .select("provider_voice_id")
      .eq("id", options.voiceProfileId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (profile?.provider_voice_id) return profile.provider_voice_id;
  }

  const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
  const { data: latestProfile } = await supabaseAdmin
    .from("voice_profiles")
    .select("provider_voice_id")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestProfile?.provider_voice_id) return latestProfile.provider_voice_id;

  return defaultElevenLabsVoiceId();
}

export async function synthesizeSpeech(options: {
  text: string;
  voiceId?: string;
  modelId?: string;
}): Promise<ArrayBuffer> {
  const apiKey = elevenLabsApiKey();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

  const voiceId = options.voiceId ?? defaultElevenLabsVoiceId();
  const modelId = options.modelId ?? process.env.ELEVENLABS_MODEL_ID ?? "eleven_turbo_v2_5";

  const response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: options.text,
      model_id: modelId,
      voice_settings: { stability: 0.45, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 401) {
      const looksLikeId = !apiKey.startsWith("sk_");
      throw new Error(
        looksLikeId
          ? "ElevenLabs 401 — that value is not a valid API secret. In ElevenLabs → Developers → API Keys, create a key and copy the full secret (usually starts with sk_). Paste that into Vercel as ELEVENLABS_API_KEY (Production), then Redeploy. Do not paste the Key ID / name."
          : "ElevenLabs rejected the API key (401). Create a new key in ElevenLabs → Developers → API Keys (enable Text to Speech), paste the full secret into Vercel ELEVENLABS_API_KEY, then Redeploy.",
      );
    }
    if (response.status === 404) {
      throw new Error(
        "ElevenLabs voice ID not found. Link your voice in Voice Scripts (paste Voice ID from ElevenLabs → Voices), or set ELEVENLABS_VOICE_ID in Vercel.",
      );
    }
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  return response.arrayBuffer();
}

export async function cloneVoiceFromSample(options: {
  name: string;
  sampleBuffer: ArrayBuffer;
  sampleFileName?: string;
}): Promise<{ voiceId: string }> {
  const apiKey = elevenLabsApiKey();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

  const form = new FormData();
  form.append("name", options.name);
  form.append(
    "files",
    new Blob([options.sampleBuffer], { type: "audio/mpeg" }),
    options.sampleFileName ?? "sample.mp3",
  );
  form.append("description", "VoiceReach cloned voice");

  const response = await fetch(`${ELEVENLABS_BASE}/voices/add`, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 401 && detail.includes("create_instant_voice_clone")) {
      throw new ElevenLabsCloneNotAllowedError();
    }
    throw new Error(`ElevenLabs clone failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const json = (await response.json()) as { voice_id?: string };
  if (!json.voice_id) throw new Error("ElevenLabs clone returned no voice_id");
  return { voiceId: json.voice_id };
}

export class ElevenLabsCloneNotAllowedError extends Error {
  constructor() {
    super("ELEVENLABS_CLONE_NOT_ALLOWED");
    this.name = "ElevenLabsCloneNotAllowedError";
  }
}

export async function verifyElevenLabsVoice(voiceId: string): Promise<boolean> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return false;

  const response = await fetch(`${ELEVENLABS_BASE}/voices/${encodeURIComponent(voiceId)}`, {
    headers: { "xi-api-key": apiKey },
  });
  return response.ok;
}
