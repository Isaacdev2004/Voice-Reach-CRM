export type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_path?: string;
  captured_at?: string;
};

const STORAGE_KEY = "ari_utm_attribution";

export function parseUtmFromSearch(search: string): UtmParams {
  const params = new URLSearchParams(search);
  const utm: UtmParams = {};
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ] as const) {
    const value = params.get(key)?.trim();
    if (value) utm[key] = value;
  }
  return utm;
}

export function hasUtm(params: UtmParams) {
  return Boolean(
    params.utm_source ||
      params.utm_medium ||
      params.utm_campaign ||
      params.utm_term ||
      params.utm_content,
  );
}

export function saveUtmAttribution(extra?: Partial<UtmParams>) {
  if (typeof window === "undefined") return;
  const fromUrl = parseUtmFromSearch(window.location.search);
  if (!hasUtm(fromUrl) && !extra) return;

  const existing = readUtmAttribution();
  const merged: UtmParams = {
    ...existing,
    ...fromUrl,
    ...extra,
    captured_at: new Date().toISOString(),
    landing_path: extra?.landing_path ?? window.location.pathname,
    referrer: extra?.referrer ?? (document.referrer || undefined),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export function readUtmAttribution(): UtmParams {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UtmParams;
  } catch {
    return {};
  }
}

export function clearUtmAttribution() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
