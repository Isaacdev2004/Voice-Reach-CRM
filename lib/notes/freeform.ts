export function titleFromFreeform(body: string, title?: string) {
  const explicit = title?.trim();
  if (explicit) return explicit.slice(0, 200);
  const first = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return (first || "Untitled").slice(0, 200);
}

/** Combine stored title + body into one freeform document for the canvas. */
export function freeformDocument(title: string, body: string) {
  const t = title.trim();
  const b = body.trim();
  if (!t) return body;
  if (!b) return title;
  // Already starts with title line
  if (b === t || b.startsWith(`${t}\n`) || b.startsWith(`${t}\r\n`)) return body;
  // Legacy notes: title and body were separate fields
  return `${t}\n\n${b}`;
}
