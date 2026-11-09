import type { PDFFont } from "pdf-lib";

export const pdfText = (value: string) =>
  value.replace(/\s+/gu, " ").trim().normalize("NFC");

// Fontkit shaping is size-independent. Cache measured runs per embedded font,
// so fitting long fields does not repeatedly shape every prefix at every size.
const measurements = new WeakMap<PDFFont, Map<string, number>>();
function measure(font: PDFFont, value: string, size: number) {
  let cache = measurements.get(font);
  if (!cache) {
    cache = new Map();
    measurements.set(font, cache);
  }
  let width = cache.get(value);
  if (width === undefined) {
    width = font.widthOfTextAtSize(value, 1);
    if (cache.size < 5000) cache.set(value, width);
  }
  return width * size;
}

/** Measure the embedded font, including unbroken email/URL tokens. */
export function wrapPdfText(
  value: string,
  width: number,
  size: number,
  font: PDFFont,
) {
  const rows: string[] = [];
  let row = "";
  for (const word of pdfText(value).split(" ")) {
    const next = row ? `${row} ${word}` : word;
    if (measure(font, next, size) <= width) {
      row = next;
      continue;
    }
    if (row) rows.push(row);
    row = "";
    for (const character of word) {
      if (row && measure(font, row + character, size) > width) {
        rows.push(row);
        row = "";
      }
      row += character;
    }
  }
  if (row) rows.push(row);
  return rows;
}

export function fitPdfText(
  value: string,
  font: PDFFont,
  options: {
    width: number;
    size: number;
    maxLines: number;
    minSize?: number;
    abbreviate?: boolean;
    height?: number;
  },
) {
  const minimum = Math.min(options.size, options.minSize ?? 8);
  let size = options.size;
  let rows = wrapPdfText(value, options.width, size, font);
  const fits = () =>
    rows.length <= options.maxLines &&
    rows.length * size * 1.35 <= (options.height ?? Infinity);
  if (!fits() && size > minimum) {
    const initial = size;
    size = minimum;
    rows = wrapPdfText(value, options.width, size, font);
    if (fits()) {
      let low = 0,
        high = Math.ceil((initial - minimum) * 4);
      while (low < high) {
        const tick = Math.ceil((low + high) / 2);
        size = Math.min(initial, minimum + tick / 4);
        rows = wrapPdfText(value, options.width, size, font);
        if (fits()) low = tick;
        else high = tick - 1;
      }
      size = Math.min(initial, minimum + low / 4);
      rows = wrapPdfText(value, options.width, size, font);
    }
  }
  let abbreviated = false;
  if (!fits()) {
    if (!options.abbreviate)
      throw Error(
        "Text exceeds its PDF area; no disclosure or amount was discarded.",
      );
    const count = Math.min(
      options.maxLines,
      Math.floor((options.height ?? Infinity) / (size * 1.35)),
    );
    if (count < 1) throw Error("No readable space remains for this PDF field.");
    rows = rows.slice(0, count);
    const last = Array.from(rows.at(-1) ?? "");
    while (
      last.length &&
      measure(font, last.join("") + "…", size) > options.width
    )
      last.pop();
    rows[rows.length - 1] = last.join("").trimEnd() + "…";
    abbreviated = true;
  }
  return { rows, size, abbreviated, height: rows.length * size * 1.35 };
}
