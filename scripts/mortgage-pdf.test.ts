import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PDFDocument, PDFDict, PDFName, PDFHexString } from "pdf-lib";
import { mortgagePdfModel } from "../lib/financing/mortgage-pdf-model";
import { generateMortgagePdf } from "../lib/financing/mortgage-pdf";
import { sampleInput, pdfAssets } from "./mortgage-pdf-sample";
import { calculate, cents } from "../lib/financing/calculators";
import { BrandKitSchema } from "../lib/settings/brand-kit";
test("all monthly components and comparisons use the existing engine, with exact cent reconciliation", () => {
  for (const price of [250000, 450000, 750000])
    for (const rate of [0, 3.125, 6.25, 9.99]) {
      const input = structuredClone(sampleInput);
      input.calculation.homePrice = price;
      input.calculation.interestRate = rate;
      const model = mortgagePdfModel(input),
        existing = calculate(input.calculation);
      assert.equal(model.result.total, existing.total);
      assert.equal(
        cents(
          model.rows.reduce((sum, r) => sum + r.amount, 0) + model.rounding,
        ),
        existing.total,
      );
      assert.equal(model.rows[3].amount, 0);
      for (const c of model.comparisons) {
        const expected = calculate({
          ...input.calculation,
          interestRate: c.rate,
          termYears: c.termYears,
        });
        assert.equal(c.pi, expected.lines[0].amount);
        assert.equal(c.total, expected.total);
      }
    }
});
test("missing fields are not fabricated; unprovided closing costs do not become cash-needed estimates", () => {
  const input = structuredClone(sampleInput);
  delete input.client;
  input.context.address = "";
  input.context.closingCosts = null;
  input.context.prepaids = null;
  input.context.reserves = null;
  input.context.lenderId = null;
  input.calculation.annualInsurance = 0;
  const m = mortgagePdfModel(input);
  assert.equal(m.buyer, "Not Provided");
  assert.equal(m.address, "Property Not Provided");
  assert.equal(m.cash, null);
  assert.equal(m.closing, null);
  assert.equal(m.lender, undefined);
  assert.ok(m.warnings.some((w) => w.includes("Insurance not provided")));
  assert.equal(m.money(null), "Not Provided");
});
test("explicit zero amounts remain zero, insurance review and ARM reset limitations remain prominent", () => {
  const input = structuredClone(sampleInput);
  input.context.closingCosts = 0;
  input.context.prepaids = 0;
  input.context.reserves = 0;
  input.calculation.annualInsurance = 120;
  const m = mortgagePdfModel(input);
  assert.equal(m.cash, input.calculation.downPayment);
  assert.ok(m.warnings[0].includes("below $25"));
  assert.equal(m.comparisons[2].arm, true);
  assert.match(m.comparisons[2].consideration, /Future resets are not modeled/);
});
test("reusable brand settings round-trip without changing branding approval or entitlements", () => {
  const kit = BrandKitSchema.parse({
    approved: true,
    financingPdf: { template: "cobranded", imagery: false },
  });
  assert.equal(kit.approved, true);
  assert.equal(BrandKitSchema.parse(kit).financingPdf.template, "cobranded");
  assert.equal(BrandKitSchema.parse({}).financingPdf.template, "myari");
});
test("unclassified fees do not double-count prepaid costs in cash needed", () => {
  const input = structuredClone(sampleInput);
  input.calculation.fees = [
    {
      label: "Prepaid insurance",
      amount: 1800,
      source: "subscriber",
      reference: "",
      effectiveDate: "",
    },
  ];
  const m = mortgagePdfModel(input);
  assert.equal(m.cash, 99500);
  assert.equal(m.itemizedFees, 1800);
  input.context.closingCosts = null;
  assert.equal(mortgagePdfModel(input).cash, null);
});
test("unauthorized lender image bytes are never embedded in PDF resources", async () => {
  const input = structuredClone(sampleInput);
  input.partners[0].brandingAuthorized = false;
  const assets = await pdfAssets();
  assets.lenderPhoto = new Uint8Array([1, 2, 3]);
  assets.lenderLogo = new Uint8Array([1, 2, 3]);
  const pdf = await PDFDocument.load(await generateMortgagePdf(input, assets));
  assert.equal(pdf.getPageCount(), 2);
});
test("standard report is exactly two true Letter pages with fonts and selectable text across edge cases", async () => {
  const assets = await pdfAssets();
  for (const name of [
    "complete",
    "missing",
    "low-insurance",
    "long-names",
    "no-comparisons",
    "all-zero",
    "image-free",
  ] as const) {
    const input = structuredClone(sampleInput);
    if (name === "missing") {
      delete input.client;
      input.context.address = "";
      input.context.lenderId = null;
      input.context.closingCosts = null;
      input.context.prepaids = null;
      input.context.reserves = null;
      input.calculation.annualInsurance = 0;
    }
    if (name === "low-insurance") input.calculation.annualInsurance = 120;
    if (name === "long-names") {
      input.branding.name =
        "Alexandra Example-Cartagena, Licensed Real Estate Professional";
      input.branding.brokerage =
        "Example Coastal Residential and Commercial Real Estate Advisors";
      input.partners[0].name =
        "Example Home Lending and Residential Mortgage Advisory Services";
      input.partners[0].contact =
        "Jordan Alexandra Example, Mortgage Financing Specialist";
    }
    if (name === "no-comparisons") input.calculation.comparisons = [];
    if (name === "all-zero") {
      input.calculation.downPayment = input.calculation.homePrice;
      input.calculation.interestRate = 0;
      input.calculation.annualInsurance = 0;
      input.calculation.annualTax = 0;
    }
    if (name === "image-free")
      input.preferences = { template: "myari", imagery: false };
    const bytes = await generateMortgagePdf(input, assets),
      pdf = await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(), 2);
    for (const page of pdf.getPages()) {
      assert.equal(page.getWidth(), 612);
      assert.equal(page.getHeight(), 792);
      assert.ok(page.node.Resources());
    }
    await fs.writeFile(`docs/mortgage-pdf-2/test-${name}.pdf`, bytes);
  }
});
test("overflow is blocked explicitly instead of dropping disclosures or extra products", () => {
  const input = structuredClone(sampleInput);
  input.context.disclosures = "Important disclosure. ".repeat(80);
  assert.throws(() => mortgagePdfModel(input), /Shorten custom assumptions/);
  input.context.disclosures = "";
  input.calculation.comparisons.push({
    label: "Fourth",
    rate: 6,
    termYears: 20,
  });
  assert.throws(() => mortgagePdfModel(input), /up to three/);
});

test("schema-valid large amounts fit every comparison without changing a cent", async () => {
  const input = structuredClone(sampleInput);
  input.calculation.homePrice = 1_000_000_000_000;
  const expected = calculate(input.calculation);
  const bytes = await generateMortgagePdf(input, await pdfAssets());
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 2);
  assert.equal(mortgagePdfModel(input).result.total, expected.total);
  await fs.writeFile("docs/mortgage-pdf-2/test-large-amount.pdf", bytes);
});

test("long agent/lender details, addresses and sources fit all branding modes, with or without imagery", async () => {
  const { mortgageOverflowInput } = await import(
    "./mortgage-pdf-overflow-fixture"
  );
  const input = mortgageOverflowInput();
  const before = structuredClone(input);
  const assets = await pdfAssets();
  assets.agentPhoto = assets.logo;
  assets.agentLogo = assets.logo;
  assets.lenderPhoto = assets.logo;
  assets.lenderLogo = assets.logo;
  for (const template of ["myari", "agent", "cobranded"] as const) {
    for (const imagery of [true, false]) {
      let abbreviated = false;
      const bytes = await generateMortgagePdf(
        { ...input, preferences: { template, imagery } },
        assets,
        {
          onAbbreviated: () => {
            abbreviated = true;
          },
        },
      );
      const pdf = await PDFDocument.load(bytes);
      assert.equal(pdf.getPageCount(), 2);
      assert.ok(abbreviated);
      assert.deepEqual(
        pdf.getPages().map((p) => p.getSize()),
        [
          { width: 612, height: 792 },
          { width: 612, height: 792 },
        ],
      );
      const annotations = pdf.getPage(1).node.Annots();
      assert.ok(
        annotations && annotations.size() >= 4,
        "Full contact targets/abbreviated details retained",
      );
      const targets = annotations!
        .asArray()
        .map((ref) => {
          const annotation = pdf.context.lookup(ref, PDFDict);
          const action = annotation.lookupMaybe(PDFName.of("A"), PDFDict);
          return action
            ?.lookupMaybe(PDFName.of("URI"), PDFHexString)
            ?.decodeText();
        })
        .filter(Boolean);
      assert.ok(targets.includes(`mailto:${input.branding.email}`));
      assert.ok(targets.includes(input.branding.website));
      assert.ok(targets.includes(`mailto:${input.partners[0].email}`));
      assert.ok(targets.includes(input.partners[0].website));

      await fs.writeFile(
        `docs/mortgage-pdf-2/test-overflow-${template}-${imagery}.pdf`,
        bytes,
      );
    }
  }
  assert.deepEqual(input, before, "Rendering must not change saved inputs");
});

test("measured text fits its actual column with a readable font and intentional abbreviation", async () => {
  const { fitPdfText } = await import("../lib/financing/pdf-text-layout");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont((await pdfAssets()).sans);
  for (const value of [
    "María O’Example — Realty & Co.",
    "name".repeat(100) + "@example.test",
    "https://example.test/" + "long-path/".repeat(50),
    "\nMissing\tdata\r\n",
    "",
  ]) {
    const fit = fitPdfText(value, font, {
      width: 240,
      size: 10,
      maxLines: 2,
      abbreviate: true,
    });
    assert.ok(fit.size >= 8);
    assert.ok(fit.rows.length <= 2);
    for (const row of fit.rows)
      assert.ok(font.widthOfTextAtSize(row, fit.size) <= 240.01);
    if (fit.abbreviated) assert.match(fit.rows.at(-1)!, /…$/);
  }
  assert.throws(
    () =>
      fitPdfText("Important disclosure. ".repeat(100), font, {
        width: 240,
        size: 10,
        maxLines: 2,
      }),
    /no disclosure or amount was discarded/,
  );
});

test("long client names retain a safe dated estimate filename", async () => {
  const { mortgagePdfFilename } = await import(
    "../lib/financing/mortgage-pdf-browser"
  );
  const { mortgageOverflowInput } = await import(
    "./mortgage-pdf-overflow-fixture"
  );
  const name = mortgagePdfFilename(mortgageOverflowInput());
  assert.ok(name.length <= 144);
  assert.match(name, /-2026-10-30-estimate\.pdf$/);
  assert.match(name, /^[a-zA-Z0-9._-]+$/);
});
