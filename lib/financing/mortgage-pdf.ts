import {
  PDFDocument,
  PDFName,
  PDFHexString,
  rgb,
  type PDFPage,
  type PDFFont,
  type PDFImage,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { fitPdfText, pdfText } from "./pdf-text-layout";
import { mortgagePdfModel, type MortgagePdfInput } from "./mortgage-pdf-model";
import { usd } from "./calculators";
export type MortgagePdfAssets = {
  serif: Uint8Array;
  serifBold: Uint8Array;
  sans: Uint8Array;
  sansBold: Uint8Array;
  logo?: Uint8Array;
  architecture?: Uint8Array;
  agentPhoto?: Uint8Array;
  agentLogo?: Uint8Array;
  lenderPhoto?: Uint8Array;
  lenderLogo?: Uint8Array;
};
const C = {
  ivory: rgb(0.981, 0.97, 0.947),
  ink: rgb(0.2, 0.19, 0.16),
  muted: rgb(0.4, 0.39, 0.35),
  bronze: rgb(0.58, 0.39, 0.24),
  green: rgb(0.35, 0.44, 0.36),
  sand: rgb(0.79, 0.71, 0.58),
  clay: rgb(0.66, 0.5, 0.4),
  sage: rgb(0.6, 0.67, 0.55),
  line: rgb(0.88, 0.84, 0.77),
  white: rgb(1, 1, 1),
};
const W = 612,
  H = 792;
/** True PDF text, paths and embedded images/fonts. Never a screenshot conversion. */
export async function generateMortgagePdf(
  input: MortgagePdfInput,
  assets: MortgagePdfAssets,
  options: { onAbbreviated?: () => void } = {},
) {
  const m = mortgagePdfModel(input),
    doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [serif, serifBold, sans, sansBold] = await Promise.all([
    doc.embedFont(assets.serif, { subset: false }),
    doc.embedFont(assets.serifBold, { subset: false }),
    doc.embedFont(assets.sans, { subset: false }),
    doc.embedFont(assets.sansBold, { subset: false }),
  ]);
  doc.setTitle("Your Path to Homeownership — Preliminary Estimate");
  doc.setAuthor(input.branding.name || "MyARI");
  doc.setSubject(
    "Illustrative mortgage financing presentation; not an official Loan Estimate",
  );
  doc.setCreator("MyARI Financing & Closing");
  const image = async (bytes?: Uint8Array) => {
    if (!bytes) return undefined;
    return bytes[0] === 137 ? doc.embedPng(bytes) : doc.embedJpg(bytes);
  };
  const [logo, architecture, agentPhoto, agentLogo, lenderPhoto, lenderLogo] =
    await Promise.all([
      image(assets.logo),
      m.preferences.imagery ? image(assets.architecture) : undefined,
      m.preferences.template !== "myari" ? image(assets.agentPhoto) : undefined,
      m.preferences.template !== "myari" ? image(assets.agentLogo) : undefined,
      m.preferences.template === "cobranded" && m.lender?.brandingAuthorized
        ? image(assets.lenderPhoto)
        : undefined,
      m.preferences.template === "cobranded" && m.lender?.brandingAuthorized
        ? image(assets.lenderLogo)
        : undefined,
    ]);
  function rect(
    p: PDFPage,
    x: number,
    y: number,
    w: number,
    h: number,
    color = C.white,
  ) {
    if (x >= 36 && w < 550 && w > 120 && h > 50) {
      const r = 10;
      const path = `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
      p.drawSvgPath(path, { x, y: H - y, color });
    } else p.drawRectangle({ x, y: H - y - h, width: w, height: h, color });
  }
  function line(p: PDFPage, x: number, y: number, w: number) {
    p.drawLine({
      start: { x, y: H - y },
      end: { x: x + w, y: H - y },
      thickness: 0.6,
      color: C.line,
    });
  }
  const characterSets = new Map(
    [serif, serifBold, sans, sansBold].map((font) => [
      font,
      new Set(font.getCharacterSet()),
    ]),
  );
  let abbreviated = false;
  function text(
    p: PDFPage,
    t: string,
    x: number,
    y: number,
    size = 10,
    font: PDFFont = sans,
    color = C.ink,
    width = W - 24 - x,
  ) {
    const value = pdfText(t);
    if (
      [...value].some((c) => !characterSets.get(font)!.has(c.codePointAt(0)!))
    )
      throw Error(
        "A report character is not supported by the embedded font set. Use a supported spelling for this report; saved records are unchanged.",
      );
    const fitted = fitPdfText(value, font, { width, size, maxLines: 1 });
    size = fitted.size;
    if (
      x < 0 ||
      y < 0 ||
      x + font.widthOfTextAtSize(value, size) > W - 24 + 0.01
    )
      throw Error(
        "A report field is too wide for the standard two-page layout. Shorten report fields; saved records are unchanged.",
      );
    p.drawText(value, {
      x,
      y: H - y - size,
      font,
      size,
      color,
    });
  }
  function para(
    p: PDFPage,
    t: string,
    x: number,
    y: number,
    width: number,
    size = 10,
    font: PDFFont = sans,
    color = C.muted,
    max = Infinity,
    displayOnly = false,
    height = Infinity,
    uri?: string,
    original = t,
  ) {
    const fitted = fitPdfText(t, font, {
      width,
      size,
      maxLines: max,
      abbreviate: displayOnly,
      height,
    });
    fitted.rows.forEach((r, i) =>
      text(
        p,
        r,
        x,
        y + i * fitted.size * 1.35,
        fitted.size,
        font,
        color,
        width,
      ),
    );
    if (fitted.abbreviated || uri || original !== t) {
      // Preserve the original contact target and full abbreviated field in PDF annotations.
      p.node.addAnnot(
        doc.context.register(
          doc.context.obj({
            Type: "Annot",
            Subtype: "Link",
            Rect: [x, H - y - fitted.height, x + width, H - y],
            Border: [0, 0, 0],
            Contents: PDFHexString.fromText(pdfText(original)),
            ...(uri
              ? { A: { S: PDFName.of("URI"), URI: PDFHexString.fromText(uri) } }
              : {}),
          }),
        ),
      );
    }
    if (fitted.abbreviated || original !== t) {
      abbreviated = true;
      options.onAbbreviated?.();
    }
    return fitted.height;
  }
  // Abbreviate only the user-entered source, never its dates, amounts or disclosures.
  function sourcePara(
    p: PDFPage,
    prefix: string,
    source: string,
    suffix: string,
    y: number,
    maxLines: number,
    height = Infinity,
  ) {
    const original = prefix + source + suffix;
    const fits = (value: string) => {
      try {
        fitPdfText(value, sans, { width: 540, size: 9, maxLines, height });
        return true;
      } catch {
        return false;
      }
    };
    if (fits(original))
      return para(
        p,
        original,
        36,
        y,
        540,
        9,
        sans,
        C.muted,
        maxLines,
        false,
        height,
      );
    const chars = Array.from(pdfText(source));
    let low = 0,
      high = chars.length;
    if (!fits(prefix + "…" + suffix))
      throw Error(
        "Source dates and disclosures exceed their PDF area; no content was discarded.",
      );
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (fits(prefix + chars.slice(0, mid).join("") + "…" + suffix)) low = mid;
      else high = mid - 1;
    }
    return para(
      p,
      prefix + chars.slice(0, low).join("") + "…" + suffix,
      36,
      y,
      540,
      9,
      sans,
      C.muted,
      maxLines,
      false,
      height,
      undefined,
      original,
    );
  }
  function pic(
    p: PDFPage,
    img: PDFImage | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    if (!img) return;
    const scale = Math.min(w / img.width, h / img.height);
    p.drawImage(img, {
      x: x + (w - img.width * scale) / 2,
      y: H - y - h + (h - img.height * scale) / 2,
      width: img.width * scale,
      height: img.height * scale,
    });
  }
  function heading(p: PDFPage, t: string, y: number) {
    text(p, t, 36, y, 22, serifBold);
  }
  function footer(p: PDFPage, n: number) {
    if (abbreviated)
      text(
        p,
        "Long display fields abbreviated; full details remain in source records and PDF annotations.",
        36,
        749,
        6.8,
        sans,
        C.muted,
      );
    line(p, 36, 758, 540);
    text(
      p,
      input.illustrative
        ? "ILLUSTRATIVE SAMPLE · Synthetic details"
        : "PRELIMINARY ESTIMATE · For discussion only",
      36,
      767,
      8,
      sans,
      C.muted,
    );
    text(p, `${n} / 2`, 551, 767, 9, sansBold, C.bronze);
  }
  const one = doc.addPage([W, H]);
  rect(one, 0, 0, W, H, C.ivory);
  rect(one, 0, 0, W, 183, rgb(0.94, 0.91, 0.85));
  pic(one, architecture, 372, 14, 210, 154);
  pic(
    one,
    m.preferences.template !== "myari" && agentLogo ? agentLogo : logo,
    35,
    15,
    58,
    55,
  );
  text(one, "PRELIMINARY ESTIMATE", 103, 27, 9, sansBold, C.bronze);
  text(
    one,
    `Prepared ${m.input.context.preparedDate || "date Not Provided"}`,
    103,
    43,
    9,
    sans,
    C.muted,
  );
  text(one, "Your Path to", 36, 83, 31, serif);
  text(one, "Homeownership.", 36, 115, 31, serifBold);
  text(
    one,
    "Clear numbers. Brighter possibilities.",
    37,
    157,
    11,
    sans,
    C.muted,
  );
  if (architecture)
    text(
      one,
      "Architectural inspiration · Not the subject property",
      371,
      171,
      6.8,
      sans,
      C.muted,
    );
  const buyerHeight = para(
    one,
    `${input.client ? "Saved CRM contact:" : "Buyer:"} ${m.buyer}`,
    36,
    197,
    540,
    10,
    sansBold,
    C.ink,
    2,
    true,
    22,
  );
  const addressHeight = para(
    one,
    `${m.input.context.propertyContactId ? "Saved CRM address:" : "Entered property:"} ${m.address}`,
    36,
    197 + buyerHeight + 3,
    540,
    10,
    sans,
    C.muted,
    2,
    true,
    22,
  );
  if (buyerHeight + addressHeight > 44.01)
    throw Error(
      "Buyer and address text exceed the standard two-page header. Shorten report details; saved CRM records are unchanged.",
    );
  rect(one, 36, 246, 340, 88, C.white);
  text(one, "YOUR ESTIMATED MONTHLY PAYMENT", 52, 258, 9, sansBold, C.bronze);
  text(one, usd(m.result.total), 52, 276, 35, serifBold, C.ink, 308);
  text(
    one,
    "Principal, interest + entered monthly costs",
    53,
    316,
    9,
    sans,
    C.muted,
  );
  rect(one, 386, 246, 190, 88, rgb(0.89, 0.92, 0.87));
  text(one, "LOAN AMOUNT", 400, 260, 9, sansBold, C.green);
  text(one, usd(m.mortgage.loanAmount), 400, 280, 24, serifBold, C.ink, 162);
  text(
    one,
    `${m.calculation.termYears}-year amortization`,
    400,
    312,
    10,
    sans,
    C.green,
  );
  heading(one, "A clearer view of your monthly payment", 355);
  const total = m.rows.reduce((a, r) => a + r.amount, 0),
    cx = 143,
    cy = 482,
    radius = 63;
  let angle = -90;
  if (total <= 0)
    one.drawCircle({ x: cx, y: H - cy, size: radius, color: C.line });
  for (const row of m.rows) {
    const next = angle + (total > 0 ? (row.amount / total) * 360 : 0);
    if (row.amount > 0) {
      let path = `M 0 0 `;
      for (let a = angle; a < next; a += 2)
        path += `L ${radius * Math.cos((a * Math.PI) / 180)} ${radius * Math.sin((a * Math.PI) / 180)} `;
      path += `L ${radius * Math.cos((next * Math.PI) / 180)} ${radius * Math.sin((next * Math.PI) / 180)} Z`;
      one.drawSvgPath(path, {
        x: cx,
        y: H - cy,
        color: C[row.color as keyof typeof C],
      });
    }
    angle = next;
  }
  one.drawCircle({ x: cx, y: H - cy, size: 43, color: C.ivory });
  text(one, "MONTHLY", cx - 23, cy - 13, 8, sansBold, C.muted);
  text(
    one,
    usd(m.result.total),
    cx - serifBold.widthOfTextAtSize(usd(m.result.total), 15) / 2,
    cy + 1,
    15,
    serifBold,
  );
  m.rows.forEach((r, i) => {
    rect(one, 252, 403 + i * 30, 8, 8, C[r.color as keyof typeof C]);
    text(one, r.label, 270, 400 + i * 30, 10, sans);
    const v = usd(r.amount);
    text(
      one,
      v,
      570 - sansBold.widthOfTextAtSize(v, 10),
      400 + i * 30,
      10,
      sansBold,
    );
    line(one, 270, 421 + i * 30, 300);
  });
  if (m.rounding)
    text(
      one,
      `Cent rounding adjustment: ${usd(m.rounding)}`,
      252,
      554,
      8.5,
      sans,
      C.muted,
    );
  let warningY = 581;
  for (const warning of m.warnings) {
    warningY += para(one, warning, 36, warningY, 540, 9, sans, C.bronze, 2) + 3;
  }
  const detailY = m.warnings.length > 1 ? 638 : 625;
  line(one, 36, detailY - 7, 540);
  const detail = [
    ["Purchase price", usd(m.calculation.homePrice)],
    ["Down payment", usd(m.calculation.downPayment)],
    ["Assumed rate", `${m.calculation.interestRate}% · not APR`],
    ["Loan type", m.loanType],
  ];
  detail.forEach(([k, v], i) => {
    text(one, k, 36 + i * 139, detailY, 9, sans, C.muted);
    para(
      one,
      v,
      36 + i * 139,
      detailY + 16,
      128,
      12,
      serifBold,
      C.ink,
      2,
      k === "Loan type",
    );
  });
  text(one, "YOUR NEXT STEPS", 36, 691, 9, sansBold, C.bronze);
  [
    ["01", "Review financing options with a qualified lender."],
    ["02", "Complete preapproval when appropriate."],
    ["03", "Find the right home with your real estate agent."],
  ].forEach(([n, t], i) => {
    text(one, n, 36 + i * 184, 711, 15, serifBold, C.bronze);
    para(one, t, 61 + i * 184, 711, 145, 9.3, sans, C.ink, 3);
  });
  footer(one, 1);
  const two = doc.addPage([W, H]);
  rect(two, 0, 0, W, H, C.ivory);
  text(two, "MYARI · FINANCING & CLOSING", 36, 28, 9, sansBold, C.bronze);
  heading(two, "Understanding Your Financing Options", 52);
  text(
    two,
    "Compare the assumptions. Choose your next conversation.",
    36,
    83,
    10,
    sans,
    C.muted,
  );
  const defaults = ["30-Year Fixed", "15-Year Fixed", "5/1 ARM"];
  for (let i = 0; i < 3; i++) {
    const x = 36 + i * 184,
      c = m.comparisons[i];
    rect(two, x, 102, 172, 204, i === 1 ? rgb(0.91, 0.93, 0.88) : C.white);
    para(
      two,
      c?.label || defaults[i],
      x + 12,
      114,
      148,
      15,
      serifBold,
      C.ink,
      2,
      true,
      27,
    );
    if (!c) {
      para(
        two,
        "Not Provided. Add a comparison rate and term in the calculator to model this option.",
        x + 12,
        161,
        148,
        10,
        sans,
        C.muted,
        6,
      );
      continue;
    }
    text(two, usd(c.pi), x + 12, 142, 25, serifBold, C.ink, 148);
    text(
      two,
      c.arm ? "Initial monthly P&I" : "Monthly principal & interest",
      x + 12,
      171,
      8.5,
      sans,
      C.muted,
    );
    text(
      two,
      `${usd(c.total)} total / month`,
      x + 12,
      190,
      11,
      sansBold,
      C.ink,
      148,
    );
    text(
      two,
      `Assumed ${c.rate}% · ${c.termYears} years`,
      x + 12,
      208,
      9,
      sans,
    );
    text(two, `Loan ${usd(m.mortgage.loanAmount)}`, x + 12, 224, 9, sans);
    para(two, c.benefit, x + 12, 241, 148, 9, sans, C.green, 2);
    para(two, c.consideration, x + 12, 266, 148, 8.9, sans, C.muted, 3);
  }
  sourcePara(
    two,
    "Entered rate source: ",
    m.rateSource,
    `. Source date: ${m.rateDate}. Comparisons are illustrative, not eligibility or lender offers.`,
    314,
    2,
  );
  heading(two, "What to plan for at closing", 352);
  rect(two, 36, 385, 200, 72, rgb(0.89, 0.92, 0.87));
  text(two, "CASH NEEDED AT CLOSING", 49, 395, 8.5, sansBold, C.green);
  text(two, m.money(m.cash), 49, 415, 23, serifBold, C.ink, 174);
  text(
    two,
    "Excludes deposits / credits not modeled",
    49,
    444,
    8,
    sans,
    C.muted,
  );
  const cashRows = [
    ["Down payment", usd(m.calculation.downPayment)],
    ["Closing costs", m.money(m.closing)],
    ["Prepaid expenses", m.money(m.input.context.prepaids)],
    ["Reserves", m.money(m.input.context.reserves)],
  ];
  cashRows.forEach(([k, v], i) => {
    text(two, k, 252, 385 + i * 19, 9.5, sans);
    text(
      two,
      v,
      570 - sansBold.widthOfTextAtSize(v, 9.5),
      385 + i * 19,
      9.5,
      sansBold,
    );
  });
  sourcePara(
    two,
    "Common categories: settlement, lender, recording, prepaids and reserves. Fee source: ",
    m.feeSource,
    `. Date: ${m.feeDate}.${m.itemizedFees !== null ? ` Itemized calculator fees: ${usd(m.itemizedFees)} (classification not provided; not added to cash needed).` : ""}`,
    466,
    3,
    34,
  );
  text(two, "IMPORTANT ASSUMPTIONS", 36, 503, 9, sansBold, C.bronze);
  para(
    two,
    "Rates and fees are estimates; actual lender terms may differ. Verify taxes, insurance, HOA and mortgage insurance. Not an official Loan Estimate, Closing Disclosure, approval or rate lock. ARM figures show initial-rate payments only; future resets are not modeled.",
    36,
    520,
    540,
    9.2,
    sans,
    C.muted,
    4,
  );
  const extras = [
    m.input.context.assumptions,
    m.input.context.disclosures,
    input.branding.disclosures,
  ]
    .filter(Boolean)
    .join(" ");
  if (extras) para(two, extras, 36, 565, 540, 8.6, sans, C.muted, 3, false, 35);
  const teamY = extras ? 606 : 572;
  heading(two, "Your Home-Buying Team", teamY);
  const cardsTop = teamY + 31;
  function card(
    x: number,
    title: string,
    name: string,
    company: string,
    details: string[],
    photo?: PDFImage,
    brandLogo?: PDFImage,
  ) {
    const width = 260;
    rect(two, x, cardsTop, width, 747 - cardsTop, C.white);
    text(two, title.toUpperCase(), x + 10, cardsTop + 8, 8, sansBold, C.bronze);
    let y = cardsTop + 23;
    const visible = details.filter(Boolean);
    const linkFor = (detail: string) =>
      /^https:\/\//i.test(detail)
        ? detail
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(detail)
          ? `mailto:${detail}`
          : undefined;
    let regular = false;
    try {
      const measure = (
        value: string,
        size: number,
        font: PDFFont,
        width: number,
        maxLines: number,
      ) =>
        fitPdfText(value, font, { width, size, minSize: size, maxLines })
          .height;
      let bottom =
        y +
        Math.max(
          measure(name, 11, serifBold, 240 - (photo ? 39 : 0), 3),
          photo ? 34 : 0,
        ) +
        2;
      if (company) bottom += measure(company, 9, sans, 240, 3) + 2;
      for (const detail of visible)
        bottom += measure(detail, 8.5, sans, 240, 2) + 1;
      regular = bottom <= 745;
    } catch {
      /* Use the bounded layout only when the approved spacing cannot fit. */
    }
    if (regular) {
      pic(two, photo, x + 10, y, 32, 32);
      const height = para(
        two,
        name,
        x + 10 + (photo ? 39 : 0),
        y,
        240 - (photo ? 39 : 0),
        11,
        serifBold,
        C.ink,
        3,
      );
      y += Math.max(height, photo ? 34 : 0) + 2;
      if (company)
        y += para(two, company, x + 10, y, 240, 9, sans, C.muted, 3) + 2;
      for (const detail of visible)
        y +=
          para(
            two,
            detail,
            x + 10,
            y,
            240,
            8.5,
            sans,
            C.ink,
            2,
            false,
            Infinity,
            linkFor(detail),
          ) + 1;
    } else {
      const photoW = photo
        ? details.filter(Boolean).length >= 4 && extras
          ? 24
          : 32
        : 0;
      pic(two, photo, x + 10, y, photoW, photoW);
      const bottom = 743;
      // Allocate a bounded share to each field, leaving room for every contact method.
      const slots = 1 + (company ? 1 : 0) + visible.length;
      const rowBudget = Math.min(27, (bottom - y - slots) / slots);
      const h = para(
        two,
        name,
        x + 10 + photoW + (photo ? 7 : 0),
        y,
        width - 20 - photoW - (photo ? 7 : 0),
        11,
        serifBold,
        C.ink,
        2,
        true,
        rowBudget,
      );
      y += Math.max(h, photoW);
      if (company)
        y += para(
          two,
          company,
          x + 10,
          y,
          width - 20,
          9,
          sans,
          C.muted,
          2,
          true,
          Math.max(10.8, (bottom - y) / (visible.length + 1)),
        );
      for (const [index, detail] of visible.entries()) {
        const uri = /^https:\/\//i.test(detail)
          ? detail
          : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(detail)
            ? `mailto:${detail}`
            : undefined;
        const budget = (bottom - y) / (visible.length - index);
        y += para(
          two,
          detail,
          x + 10,
          y,
          width - 20,
          8.5,
          sans,
          C.ink,
          Infinity,
          true,
          budget,
          uri,
        );
      }
    }
    if (brandLogo) pic(two, brandLogo, x + 205, cardsTop + 6, 44, 18);
  }
  const agent = input.branding;
  const mode = m.preferences.template;
  if (mode === "myari")
    card(
      36,
      "Your agent",
      agent.name || "Connect with your real estate agent",
      agent.brokerage,
      [agent.phone, agent.email || "", agent.website || ""],
    );
  else
    card(
      36,
      "Real estate agent",
      agent.name || "Agent details Not Provided",
      agent.brokerage,
      [
        agent.phone,
        agent.email || "",
        agent.website || "",
        agent.license ? `License: ${agent.license}` : "",
      ],
      agentPhoto,
      agentLogo,
    );
  const lender = m.lender;
  if (lender)
    card(
      316,
      "Mortgage lender",
      lender.contact || lender.name,
      lender.contact ? lender.name : "",
      [
        lender.phone,
        lender.email,
        lender.website,
        lender.license
          ? `NMLS / license: ${lender.license}`
          : "NMLS / license: Not Provided",
      ],
      mode === "cobranded" && lender.brandingAuthorized
        ? lenderPhoto
        : undefined,
      mode === "cobranded" && lender.brandingAuthorized
        ? lenderLogo
        : undefined,
    );
  else
    card(316, "Mortgage lender", "Let’s connect you with a lender", "", [
      "Choose a preferred lender with your agent.",
    ]);
  footer(two, 2);
  return doc.save();
}
