export function draftFingerprint(value: unknown): string {
  const normalize = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(normalize)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .filter(
                ([k, x]) =>
                  x !== undefined &&
                  k !== "voicePlaybackUrl" &&
                  k !== "voiceAssetTitle",
              )
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, normalize(x)]),
          )
        : v;
  return JSON.stringify(normalize(value));
}
