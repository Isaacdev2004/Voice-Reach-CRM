import { clerkClient } from "@clerk/nextjs/server";
import { getClerkKeyMode, hasClerkEnv } from "@/lib/clerk-env";

export type ProbeResult = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

export async function probeOpenAiConnectivity(): Promise<ProbeResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { ok: false, latencyMs: 0, error: "not_configured" };

  const started = Date.now();
  try {
    const response = await fetch("https://api.openai.com/v1/models?limit=1", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(12_000),
    });
    const latencyMs = Date.now() - started;
    if (response.ok) return { ok: true, latencyMs };

    const error =
      response.status === 401
        ? "invalid_key"
        : response.status === 429
          ? "rate_limited"
          : "upstream_error";
    return { ok: false, latencyMs, error };
  } catch {
    return { ok: false, latencyMs: Date.now() - started, error: "network" };
  }
}

export async function probeClerkBackend(userId: string): Promise<
  ProbeResult & {
    mode: ReturnType<typeof getClerkKeyMode>;
    primaryEmailVerified?: boolean;
  }
> {
  const mode = getClerkKeyMode();
  if (!hasClerkEnv()) {
    return { ok: false, latencyMs: 0, error: "not_configured", mode };
  }

  const started = Date.now();
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primary =
      user.emailAddresses.find((a) => a.id === user.primaryEmailAddressId) ??
      user.emailAddresses[0];
    return {
      ok: true,
      latencyMs: Date.now() - started,
      mode,
      primaryEmailVerified: primary?.verification?.status === "verified",
    };
  } catch {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: "backend_unreachable",
      mode,
    };
  }
}
