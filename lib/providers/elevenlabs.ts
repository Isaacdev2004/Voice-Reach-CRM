const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export function defaultElevenLabsVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
}

export async function synthesizeSpeech(options: {
  text: string;
  voiceId?: string;
  modelId?: string;
}): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
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
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  return response.arrayBuffer();
}

export async function cloneVoiceFromSample(options: {
  name: string;
  sampleBuffer: ArrayBuffer;
  sampleFileName?: string;
}): Promise<{ voiceId: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
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
    throw new Error(`ElevenLabs clone failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const json = (await response.json()) as { voice_id?: string };
  if (!json.voice_id) throw new Error("ElevenLabs clone returned no voice_id");
  return { voiceId: json.voice_id };
}
