import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculate,
  cents,
  payment,
  CalculationSchema,
  type Calculation,
} from "../lib/financing/calculators";
import { reportLines, reportPdf, reportSvg } from "../lib/financing/reports";
import { ContextSchema, PartnerSchema } from "../lib/financing/schemas";
const fees = [
  {
    label: "Entered title/settlement",
    amount: 1300.25,
    source: "subscriber" as const,
    reference: "",
    effectiveDate: "",
  },
  {
    label: "County transfer (manual)",
    amount: 250.5,
    source: "estimate" as const,
    reference: "",
    effectiveDate: "",
  },
];
const seller = {
  price: 300000,
  payoff: 150000,
  commissionPercent: 2.5,
  commissionFlat: 100,
  credits: 2000,
  adjustments: -250,
  fees,
};
test("seller proceeds use itemized costs, adjustable compensation and signed prorations", () => {
  const r = calculate({ kind: "seller", ...seller });
  assert.equal(r.total, 138599.25);
  assert.equal(r.details[0].value, "$11,150.75");
  assert.equal(
    calculate({
      kind: "seller",
      ...seller,
      commissionPercent: 0,
      commissionFlat: 0,
    }).total,
    146199.25,
  );
});
test("reverse seller-to-net independently reconciles to target over varied assumptions", () => {
  for (let i = 0; i < 150; i++) {
    const targetNet = 10000 + i * 1099.13,
      commissionPercent = (i % 9) + 0.125;
    const reverse = calculate({
      kind: "seller-to-net",
      ...seller,
      commissionPercent,
      targetNet,
    });
    const forward = calculate({
      kind: "seller",
      ...seller,
      price: reverse.total,
      commissionPercent,
    });
    assert.ok(forward.total >= targetNet - 0.00001);
    assert.ok(forward.total - targetNet < 0.02);
  }
  assert.throws(() =>
    calculate({
      kind: "seller-to-net",
      ...seller,
      targetNet: 100000,
      commissionPercent: 100,
    }),
  );
});
test("buyer cash-to-close includes deposit and credits exactly once", () => {
  const r = calculate({
    kind: "buyer",
    price: 300000,
    downPayment: 60000,
    deposit: 10000,
    credits: 1500,
    fees,
  });
  assert.equal(r.total, 50050.75);
  assert.equal(
    calculate({
      kind: "buyer",
      price: 300000,
      downPayment: 0,
      deposit: 10000,
      credits: 0,
      fees: [],
    }).total,
    -10000,
  );
  assert.throws(() =>
    calculate({
      kind: "buyer",
      price: 100,
      downPayment: 101,
      deposit: 0,
      credits: 0,
      fees: [],
    }),
  );
});
test("up to five independent offers preserve financing and contingencies", () => {
  const offers = Array.from({ length: 5 }, (_, i) => ({
    ...seller,
    price: seller.price + i * 10000,
    label: `Offer ${i}`,
    financing: "Cash",
    closingDate: "2026-12-01",
    contingencies: "Inspection",
  }));
  const r = calculate({ kind: "offers", offers });
  assert.equal(r.offers?.length, 5);
  assert.equal(r.total, 177599.25);
  assert.equal(r.offers?.[0].net, 138599.25);
  assert.throws(() =>
    calculate({ kind: "offers", offers: [...offers, offers[0]] }),
  );
});
test("refinance payment and break-even reconcile independently including financed costs", () => {
  assert.ok(Math.abs(payment(240000, 6, 360) - 1438.92126) < 0.00001);
  assert.equal(payment(120000, 0, 120), 1000);
  const input = {
    kind: "refinance",
    balance: 240000,
    currentRate: 7,
    proposedRate: 6,
    remainingMonths: 360,
    newMonths: 360,
    cashOut: 0,
    financeCosts: false,
    fees: [{ label: "Costs", amount: 3600, source: "subscriber" }],
  };
  const r = calculate(input);
  const savings = cents(cents(payment(240000, 7, 360)) - 1438.92);
  assert.equal(r.details[0].value, `${Math.ceil(3600 / savings)} months`);
  assert.equal(
    calculate({ ...input, financeCosts: true }).lines[4].amount,
    243600,
  );
  assert.match(
    calculate({ ...input, proposedRate: 9 }).details[0].value,
    /No break-even/,
  );
});
test("fees distinguish location/source and never substitute official rates", () => {
  assert.equal(calculate({ kind: "fees", fees }).total, 1550.75);
  const official = {
    ...fees[0],
    source: "government",
    reference: "https://county.example/fees",
    effectiveDate: "2026-10-01",
  };
  assert.throws(() =>
    calculate({ kind: "fees", fees: [{ ...official, reference: "" }] }),
  );
  assert.equal(calculate({ kind: "fees", fees: [official] }).total, 1300.25);
  assert.equal(
    calculate({
      kind: "fees",
      fees: [{ ...official, amount: 22.5, reference: "County B quote" }],
    }).total,
    22.5,
  );
});
test("invalid, nonfinite, negative and missing financial inputs are rejected", () => {
  for (const price of [NaN, Infinity, -1, 0])
    assert.throws(() => calculate({ kind: "seller", ...seller, price }));
  assert.throws(() =>
    calculate({
      kind: "seller",
      ...seller,
      fees: [{ ...fees[0], amount: -1 }],
    }),
  );
  assert.throws(() => calculate({ kind: "buyer" }));
});
test("mortgage totals match the existing amortization engine and zero-interest edge", () => {
  const r = calculate({
    kind: "mortgage",
    homePrice: 300000,
    downPayment: 60000,
    interestRate: 0,
    termYears: 30,
    annualTax: 3600,
    annualInsurance: 1200,
    monthlyHoa: 50,
    includePmi: false,
    fees: [],
  });
  assert.equal(r.total, 1116.67);
});
test("PDF and image report totals use identical calculations, sources and disclosures", () => {
  const x = CalculationSchema.parse({ kind: "seller", ...seller });
  const ctx = ContextSchema.parse({
    county: "Synthetic county",
    state: "FL",
    address: "<script>not markup</script>",
    preparedDate: "2026-10-23",
  });
  const lines = reportLines(
    x,
    ctx,
    {
      name: "Synthetic Agent",
      phone: "555-0100",
      headshot: "",
      brokerage: "Test Realty",
      jobTitle: "Agent",
    },
    [],
  );
  assert.ok(lines.some((x) => x.includes("$138,599.25")));
  assert.ok(lines.some((x) => x.includes("compensation is negotiable")));
  const pdf = new TextDecoder().decode(reportPdf(lines));
  assert.ok(pdf.startsWith("%PDF-1.4"));
  assert.match(pdf, /138,599.25/);
  assert.match(pdf, /startxref/);
  const svg = reportSvg(lines);
  assert.match(svg, /&lt;script&gt;/);
  assert.ok(!svg.includes("<script>"));
  // Pagination, offsets and stream byte lengths remain valid with Unicode and backslashes.
  const large = new TextDecoder().decode(
    reportPdf([
      ...lines,
      ...lines,
      ...lines,
      "Unicode café — 🏠 \\ (estimate)",
    ]),
  );
  const offset = Number(large.match(/startxref\n(\d+)/)![1]);
  assert.equal(large.slice(offset, offset + 4), "xref");
  assert.match(large, /\/Count [2-9]/);
});
test("partner schemas separate types and reject unsafe logos and invalid emails", () => {
  assert.equal(
    PartnerSchema.parse({ kind: "title", name: "My authorized partner" })
      .preferred,
    false,
  );
  assert.throws(() =>
    PartnerSchema.parse({
      kind: "title",
      name: "Company",
      logoUrl: "javascript:alert(1)",
    }),
  );
  assert.throws(() =>
    PartnerSchema.parse({ kind: "title", name: "Company", email: "not-email" }),
  );
});

test("client matching supports actual names, email and formatted phone without inserting data", async () => {
  const { matchingClients, financingLinks } =
    await import("../lib/financing/workflow");
  const c = [
    {
      id: "owned",
      first_name: "Jordan",
      last_name: "Lee",
      email: "jordan@example.test",
      phone: "+15555550123",
    },
  ];
  for (const q of ["Jordan", "LEE", "jordan@example.test", "(555) 555-0123"])
    assert.equal(matchingClients(c, q).length, 1);
  assert.equal(matchingClients(c, "missing").length, 0);
  assert.equal(c.length, 1);
  assert.equal(
    financingLinks("owned").calendar,
    "/dashboard/calendar?new=event&contactId=owned",
  );
});
test("mortgage comparison reports use engine outputs rather than AI figures", () => {
  const r = calculate({
    kind: "mortgage",
    homePrice: 300000,
    downPayment: 60000,
    interestRate: 6,
    termYears: 30,
    annualTax: 0,
    annualInsurance: 0,
    monthlyHoa: 0,
    includePmi: false,
    fees: [],
    comparisons: [{ label: "15-year", rate: 6, termYears: 15 }],
  });
  const detail = r.details.find((d) => d.label.includes("Comparison:"));
  assert.ok(detail);
  assert.ok(
    detail.value.includes(
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(payment(240000, 6, 180)),
    ),
  );
});
