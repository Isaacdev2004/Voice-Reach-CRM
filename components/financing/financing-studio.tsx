"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { matchingClients, financingLinks } from "@/lib/financing/workflow";
import Image from "next/image";
import { useAiAssistant } from "@/components/ai/ai-assistant-context";
import { MortgageCalculatorPage } from "@/components/pages/stitch/MortgageCalculatorPage";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/crm/modal";
import { readApiResponse } from "@/lib/api-response";
import {
  calculate,
  CalculationSchema,
  DISCLOSURE,
  usd,
  type Calculation,
  type Fee,
  type Result,
} from "@/lib/financing/calculators";
import {
  ContextSchema,
  PartnerSchema,
  type Partner,
  type ReportContext,
} from "@/lib/financing/schemas";
import {
  reportLines,
  reportPdf,
  reportSvg,
  downloadReport,
  type Branding,
  type Client,
} from "@/lib/financing/reports";
import { ContactTasksPanel } from "@/components/crm/contact-tasks-panel";
import "./financing-studio.css";
const tabs = [
  "Mortgage Calculator",
  "Seller Net Sheet",
  "Buyer Estimate",
  "Compare Offers",
  "Partners",
  "Resources",
] as const;
const emptyBrand: Branding = {
  name: "",
  phone: "",
  headshot: "",
  brokerage: "",
  jobTitle: "",
};
const initialContext = () =>
  ContextSchema.parse({ preparedDate: new Date().toISOString().slice(0, 10) });
const defaultFees = (): Fee[] =>
  [
    "Title / settlement",
    "Recording / transfer taxes",
    "Prepaids / insurance",
    "Other closing expenses",
  ].map((label) => ({
    label,
    amount: 0,
    source: "estimate",
    reference: "",
    effectiveDate: "",
  }));
const startSeller = () => ({
  price: 0,
  payoff: 0,
  commissionPercent: 0,
  commissionFlat: 0,
  credits: 0,
  adjustments: 0,
  fees: defaultFees(),
});
type StoredReport = {
  id: string;
  created_at: string;
  payload: {
    calculation: Calculation;
    context: ReportContext;
    result: Result;
    branding: Branding;
    client?: Client;
    partners: { id: string; payload: Partner; kind: string }[];
  };
};
async function request<T>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const e = await readApiResponse<T>(res);
  if (!res.ok || !e.success) throw new Error("Request unavailable");
  return e.data;
}
function NumberField({
  label,
  value,
  onChange,
  signed = false,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  signed?: boolean;
  suffix?: string;
}) {
  return (
    <label className="fc-field">
      <span>
        {label}
        {suffix ? ` (${suffix})` : ""}
      </span>
      <input
        type="number"
        min={signed ? undefined : 0}
        step="0.01"
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) =>
          onChange(e.target.value === "" ? NaN : Number(e.target.value))
        }
      />
    </label>
  );
}
function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  type?: string;
}) {
  return (
    <label className="fc-field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function FeesEditor({
  fees,
  onChange,
}: {
  fees: Fee[];
  onChange: (v: Fee[]) => void;
}) {
  const change = (i: number, patch: Partial<Fee>) =>
    onChange(fees.map((f, n) => (n === i ? { ...f, ...patch } : f)));
  return (
    <details className="fc-fees" open>
      <summary>
        Itemized fees & sources{" "}
        <span>Manual estimates · no automatic local fee schedule</span>
      </summary>
      <p>
        Enter the applicable fees or explicitly leave zero for excluded items.
        Published/provider sources require a reference and effective date. A
        source label does not verify the amount.
      </p>
      {fees.map((f, i) => (
        <div className="fc-fee-row" key={i}>
          <TextField
            label={`Fee ${i + 1}`}
            value={f.label}
            onChange={(label) => change(i, { label })}
          />
          <NumberField
            label="Amount ($)"
            value={f.amount}
            onChange={(amount) => change(i, { amount })}
          />
          <label className="fc-field">
            <span>Source</span>
            <select
              value={f.source}
              onChange={(e) =>
                change(i, { source: e.target.value as Fee["source"] })
              }
            >
              <option value="estimate">Estimated</option>
              <option value="subscriber">Subscriber entered</option>
              <option value="government">Published government fee</option>
              <option value="provider">Authorized provider quote</option>
            </select>
          </label>
          <TextField
            label="Source / quote reference"
            value={f.reference}
            onChange={(reference) => change(i, { reference })}
          />
          <TextField
            label="Effective date"
            type="date"
            value={f.effectiveDate}
            onChange={(effectiveDate) => change(i, { effectiveDate })}
          />
          <button
            type="button"
            aria-label={`Remove fee ${i + 1}`}
            onClick={() => onChange(fees.filter((_, n) => n !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...fees,
            {
              label: "Additional fee",
              amount: 0,
              source: "estimate",
              reference: "",
              effectiveDate: "",
            },
          ])
        }
        disabled={fees.length >= 40}
      >
        + Add fee
      </button>
    </details>
  );
}
function SellerInputs({
  value,
  onChange,
}: {
  value: ReturnType<typeof startSeller>;
  onChange: (v: ReturnType<typeof startSeller>) => void;
}) {
  return (
    <>
      <div className="fc-input-grid">
        {(
          [
            ["price", "Sale price"],
            ["payoff", "Loan payoff"],
            ["commissionPercent", "Broker compensation % (negotiable)"],
            ["commissionFlat", "Flat compensation ($)"],
            ["credits", "Seller credits ($)"],
            ["adjustments", "Net prorations / adjustments (+/− $)"],
          ] as const
        ).map(([k, label]) => (
          <NumberField
            key={k}
            label={label}
            value={value[k]}
            signed={k === "adjustments"}
            onChange={(n) => onChange({ ...value, [k]: n })}
          />
        ))}
      </div>
      <FeesEditor
        fees={value.fees}
        onChange={(fees) => onChange({ ...value, fees })}
      />
    </>
  );
}
export function FinancingStudio() {
  const { user } = useUser();
  return <Workspace key={user?.id ?? "signed-out"} owner={user?.id} />;
}
function Workspace({ owner }: { owner?: string }) {
  const { openAssistant } = useAiAssistant();
  const [tab, setTab] = useState<(typeof tabs)[number]>(tabs[0]),
    [tool, setTool] = useState("main");
  const [contacts, setContacts] = useState<Client[]>([]),
    [branding, setBranding] = useState<Branding>(emptyBrand),
    [context, setContext] = useState(initialContext),
    [partners, setPartners] = useState<Partner[]>([]),
    [reports, setReports] = useState<StoredReport[]>([]);
  const [loading, setLoading] = useState(true),
    [dataError, setDataError] = useState(false),
    [storageError, setStorageError] = useState(false),
    [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false),
    [reviewed, setReviewed] = useState(false);
  const [seller, setSeller] = useState(startSeller),
    [targetNet, setTargetNet] = useState(0),
    [buyer, setBuyer] = useState({
      price: 0,
      downPayment: 0,
      deposit: 0,
      credits: 0,
      fees: defaultFees(),
    }),
    [offerRows, setOfferRows] = useState([
      {
        ...startSeller(),
        label: "Offer 1",
        financing: "",
        closingDate: "",
        contingencies: "",
      },
    ]);
  const [refi, setRefi] = useState({
      balance: 0,
      currentRate: 0,
      proposedRate: 0,
      remainingMonths: 360,
      newMonths: 360,
      cashOut: 0,
      financeCosts: false,
      fees: defaultFees(),
    }),
    [feeRows, setFeeRows] = useState(defaultFees),
    [mortgage, setMortgage] = useState<Calculation | null>(null),
    [mortgageSeed, setMortgageSeed] = useState<
      import("@/lib/mortgage/calculate").MortgageInputs | undefined
    >(undefined);
  const mortgageChanged = useCallback((v: Calculation) => {
    setMortgage(v);
    setReviewed(false);
  }, []);
  const [editor, setEditor] = useState<ReturnType<
      typeof PartnerSchema.parse
    > | null>(null),
    [partnerError, setPartnerError] = useState("");
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (!owner) return;
    let active = true;
    setLoading(true);
    void request<{ contacts: Client[]; branding: Branding }>(
      "/api/financing/context",
    )
      .then((d) => {
        if (active) {
          setContacts(d.contacts);
          setBranding(d.branding);
          setDataError(false);
        }
      })
      .catch(() => {
        if (active) setDataError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    void Promise.all([
      request<{ partners: Partner[] }>("/api/financing/partners"),
      request<{ reports: StoredReport[] }>("/api/financing/reports"),
    ])
      .then(([p, r]) => {
        if (active) {
          setPartners(p.partners);
          setReports(r.reports);
          setStorageError(false);
        }
      })
      .catch(() => {
        if (active) setStorageError(true);
      });
    return () => {
      active = false;
    };
  }, [owner, refresh]);
  useEffect(() => {
    if (!owner) return;
    try {
      const raw = sessionStorage.getItem(`myari-financing:${owner}`);
      if (raw) {
        const v = JSON.parse(raw);
        setContext(ContextSchema.parse(v.context));
        if (tabs.includes(v.tab)) setTab(v.tab);
        setSeller(v.seller ?? startSeller());
        setBuyer(
          v.buyer ?? {
            price: 0,
            downPayment: 0,
            deposit: 0,
            credits: 0,
            fees: defaultFees(),
          },
        );
        setRefi(
          v.refi ?? {
            balance: 0,
            currentRate: 0,
            proposedRate: 0,
            remainingMonths: 360,
            newMonths: 360,
            cashOut: 0,
            financeCosts: false,
            fees: defaultFees(),
          },
        );
        if (v.mortgage?.kind === "mortgage") {
          setMortgage(v.mortgage);
          setMortgageSeed(v.mortgage);
        }
        if (v.offers?.length) setOfferRows(v.offers);
        if (v.feeRows) setFeeRows(v.feeRows);
        setTargetNet(v.targetNet ?? 0);
        if (typeof v.tool === "string") setTool(v.tool);
      }
      const q = new URLSearchParams(window.location.search);
      if (q.get("contactId"))
        setContext((c) => ({ ...c, contactId: q.get("contactId") }));
    } catch {
      /* Invalid cached drafts never override authenticated records. */
    }
    setRestored(true);
  }, [owner]);
  useEffect(() => {
    if (!owner || !restored) return;
    try {
      sessionStorage.setItem(
        `myari-financing:${owner}`,
        JSON.stringify({
          context,
          tab,
          tool,
          seller,
          buyer,
          refi,
          offers: offerRows,
          feeRows,
          targetNet,
          mortgage,
        }),
      );
    } catch {
      /* Workspace remains usable without browser storage. */
    }
  }, [
    owner,
    restored,
    context,
    tab,
    tool,
    seller,
    buyer,
    refi,
    offerRows,
    feeRows,
    targetNet,
    mortgage,
  ]);
  useEffect(() => {
    if (!loading && !dataError) {
      setContext((c) => ({
        ...c,
        contactId: contacts.some((x) => x.id === c.contactId)
          ? c.contactId
          : null,
        propertyContactId: contacts.some(
          (x) => x.id === c.propertyContactId && x.property_address,
        )
          ? c.propertyContactId
          : null,
      }));
    }
  }, [contacts, loading, dataError]);
  const client = contacts.find((c) => c.id === context.contactId),
    selectedPartners = partners.filter(
      (p) => p.id === context.lenderId || p.id === context.titleId,
    );
  const patch = (p: Partial<ReportContext>) => {
    setContext((c) => ({ ...c, ...p }));
    setReviewed(false);
  };
  const pickClient = (id: string) => {
    patch({ contactId: id || null });
    setNotice("");
  };
  const visibleContacts = matchingClients(contacts, search);
  const raw = useMemo(
    () =>
      tab === "Mortgage Calculator"
        ? tool === "refinance"
          ? { kind: "refinance", ...refi }
          : mortgage
        : tab === "Seller Net Sheet"
          ? tool === "reverse"
            ? { kind: "seller-to-net", ...seller, targetNet, price: undefined }
            : { kind: "seller", ...seller }
          : tab === "Buyer Estimate"
            ? { kind: "buyer", ...buyer }
            : tab === "Compare Offers"
              ? { kind: "offers", offers: offerRows }
              : tab === "Resources" && tool === "fees"
                ? { kind: "fees", fees: feeRows }
                : null,
    [tab, tool, refi, mortgage, seller, targetNet, buyer, offerRows, feeRows],
  );
  const parsed = CalculationSchema.safeParse(raw);
  let result: Result | null = null;
  try {
    if (parsed.success) result = calculate(parsed.data);
  } catch {
    /* Validation message below. */
  }
  const calculation = parsed.success ? parsed.data : null;
  const lines =
    calculation && result
      ? reportLines(calculation, context, branding, selectedPartners, client)
      : [];
  const changeTab = (t: (typeof tabs)[number]) => {
    if (mortgage?.kind === "mortgage") setMortgageSeed(mortgage);
    setTab(t);
    setTool("main");
    setReviewed(false);
    setNotice("");
  };
  const reportKey = useRef<{ signature: string; id: string } | null>(null);
  async function saveReport() {
    if (!calculation || !result) return;
    setBusy(true);
    setNotice("");
    const signature = JSON.stringify({ calculation, context });
    if (reportKey.current?.signature !== signature)
      reportKey.current = { signature, id: crypto.randomUUID() };
    try {
      await request("/api/financing/reports", "POST", {
        id: reportKey.current.id,
        calculation,
        context,
      });
      setNotice("Report saved. Linked contact activity has been updated.");
      setRefresh((v) => v + 1);
    } catch {
      setNotice(
        "Report could not be saved. Your inputs are still here; please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function savePartner() {
    if (!editor) return;
    const p = PartnerSchema.safeParse(editor);
    if (!p.success) {
      setPartnerError("Check the name, email and HTTPS links.");
      return;
    }
    setBusy(true);
    try {
      await request("/api/financing/partners", "POST", p.data);
      setEditor(null);
      setRefresh((v) => v + 1);
    } catch {
      setPartnerError(
        "Partner could not be saved. Check the required information, then retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  const newPartner = (kind: "lender" | "title") => {
    setEditor(PartnerSchema.parse({ kind, name: "New partner" }));
    setPartnerError("");
  };
  function openReport(r: StoredReport) {
    const x = r.payload.calculation;
    setContext(ContextSchema.parse(r.payload.context));
    if (x.kind === "seller") {
      setSeller(x);
      setTab("Seller Net Sheet");
      setTool("main");
    } else if (x.kind === "seller-to-net") {
      setSeller({ ...x, price: 0 });
      setTargetNet(x.targetNet);
      setTab("Seller Net Sheet");
      setTool("reverse");
    } else if (x.kind === "buyer") {
      setBuyer(x);
      setTab("Buyer Estimate");
      setTool("main");
    } else if (x.kind === "offers") {
      setOfferRows(x.offers);
      setTab("Compare Offers");
      setTool("main");
    } else if (x.kind === "refinance") {
      setRefi(x);
      setTab("Mortgage Calculator");
      setTool("refinance");
    } else if (x.kind === "fees") {
      setFeeRows(x.fees);
      setTab("Resources");
      setTool("fees");
    } else {
      setMortgage(x);
      setMortgageSeed(x);
      setTab("Mortgage Calculator");
      setTool("main");
    }
    setNotice(
      "Saved assumptions reopened. Re-review current partner information before creating a new report.",
    );
    setReviewed(false);
  }
  const propertyWorkspace = (
    <section className="fc-card fc-workflow">
      <div className="fc-section-heading">
        <div>
          <span className="fc-eyebrow">CLIENT TO CLOSING</span>
          <h2>Property details</h2>
        </div>
        {tab === "Mortgage Calculator" ? (
          <div className="fc-subtabs">
            <button
              type="button"
              aria-pressed={tool !== "refinance"}
              onClick={() => {
                setTool("main");
                setReviewed(false);
              }}
            >
              Purchase financing
            </button>
            <button
              type="button"
              aria-pressed={tool === "refinance"}
              onClick={() => {
                setTool("refinance");
                setReviewed(false);
              }}
            >
              Refinance
            </button>
          </div>
        ) : (
          <span className="fc-muted">Select a client · Choose a property</span>
        )}
      </div>
      {loading ? (
        <p role="status">Loading your contacts…</p>
      ) : dataError ? (
        <p role="alert">
          Contacts could not be loaded.{" "}
          <button onClick={() => setRefresh((x) => x + 1)}>Retry</button>
        </p>
      ) : (
        <div className="fc-context-grid">
          <TextField
            label="Find client by name, email or phone"
            value={search}
            onChange={setSearch}
          />
          <label className="fc-field">
            <span>Selected client</span>
            <select
              aria-label="Selected client"
              value={context.contactId ?? ""}
              onChange={(e) => pickClient(e.target.value)}
            >
              <option value="">No client selected</option>
              {visibleContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} {c.email ? `· ${c.email}` : ""}
                </option>
              ))}
              {client && !visibleContacts.includes(client) && (
                <option value={client.id}>
                  {client.first_name} {client.last_name}
                </option>
              )}
            </select>
          </label>
          <label className="fc-field">
            <span>Saved property (from contact records)</span>
            <select
              aria-label="Saved property (from contact records)"
              value={context.propertyContactId ?? ""}
              onChange={(e) => {
                const c = contacts.find((c) => c.id === e.target.value);
                patch({
                  propertyContactId: c?.id ?? null,
                  address: c?.property_address ?? context.address,
                });
              }}
            >
              <option value="">Manual property / not selected</option>
              {contacts
                .filter((c) => c.property_address)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.property_address} · {c.first_name}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}
      {client && (
        <p className="fc-muted">
          {client.first_name} {client.last_name} ·{" "}
          {client.email || "No email saved"} ·{" "}
          {client.phone || "No phone saved"}
          {client.budget != null
            ? ` · Saved budget preference ${usd(client.budget)}`
            : ""}
          {client.preferred_area
            ? ` · Preferred area: ${client.preferred_area}`
            : ""}
        </p>
      )}
      <div className="fc-property-summary">
        <span className="fc-property-symbol">
          <Icon name="home_work" />
        </span>
        <div>
          <h3>{context.address || "Choose a property to get started."}</h3>
          <p>
            {context.propertyContactId
              ? "Address from your saved contact record"
              : "Enter a property address in the assumptions below."}
          </p>
          <span className="fc-source-badge">
            {context.propertyContactId ? "Saved address" : "Manual entry"}
          </span>
        </div>
        <div className="fc-property-cost-note">
          <b>Monthly costs</b>
          <p>Enter taxes, insurance and HOA in Loan details.</p>
          <span className="fc-muted">
            No automatic valuation or fee estimate.
          </span>
        </div>
      </div>
      <details className="fc-context-details">
        <summary>Property, partners & report assumptions</summary>
        <div className="fc-input-grid">
          <TextField
            label="Property address (editable)"
            value={context.address}
            onChange={(address) => patch({ address, propertyContactId: null })}
          />
          <TextField
            label="State"
            value={context.state}
            onChange={(state) => patch({ state })}
          />
          <TextField
            label="County"
            value={context.county}
            onChange={(county) => patch({ county })}
          />
          <TextField
            label="Transaction type"
            value={context.transaction}
            onChange={(transaction) => patch({ transaction })}
          />
          <TextField
            label="Estimated closing date"
            type="date"
            value={context.closingDate}
            onChange={(closingDate) => patch({ closingDate })}
          />
          {(
            [
              ["lender", "lenderId", "Preferred lender"],
              ["title", "titleId", "Preferred title company"],
            ] as const
          ).map(([kind, key, label]) => (
            <label className="fc-field" key={kind}>
              <span>{label} · optional</span>
              <select
                value={context[key] ?? ""}
                onChange={(e) => patch({ [key]: e.target.value || null })}
              >
                <option value="">None selected</option>
                {partners
                  .filter((p) => p.kind === kind)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.preferred ? " · Default" : ""}
                    </option>
                  ))}
              </select>
            </label>
          ))}
          <TextField
            label="Report title (optional)"
            value={context.reportTitle}
            onChange={(reportTitle) => patch({ reportTitle })}
          />
          <TextField
            label="Preparation date"
            type="date"
            value={context.preparedDate}
            onChange={(preparedDate) => patch({ preparedDate })}
          />
        </div>
        <label className="fc-field">
          <span>Calculation assumptions / exclusions</span>
          <textarea
            value={context.assumptions}
            onChange={(e) => patch({ assumptions: e.target.value })}
          />
        </label>
        <label className="fc-field">
          <span>
            Additional reviewed disclosures, licensing / NMLS information
          </span>
          <textarea
            value={context.disclosures}
            onChange={(e) => patch({ disclosures: e.target.value })}
          />
        </label>
        <p className="fc-muted">
          No property-price, tax, insurance or official fee integration is
          connected. Enter and verify those amounts manually. Partner selection
          is optional.
        </p>
      </details>
    </section>
  );
  return (
    <div
      className={`financing-studio ${tab === "Mortgage Calculator" && tool === "main" && !storageError && !notice ? "fc-purchase-active" : ""}`}
    >
      <nav className="fc-tabs" aria-label="Financing sections">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            aria-current={tab === t ? "page" : undefined}
            onClick={() => changeTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      {!(tab === "Mortgage Calculator" && tool === "main") && propertyWorkspace}

      {storageError && (
        <div className="fc-alert" role="status">
          Saved reports and partners are unavailable. Local calculations and
          exports remain available. Saving requires the reviewed Financing
          workspace database update.{" "}
          <button onClick={() => setRefresh((v) => v + 1)}>Retry</button>
        </div>
      )}
      {notice && (
        <p className="fc-alert" role="status">
          {notice}
        </p>
      )}
      {tab === "Mortgage Calculator" && (
        <>
          <div hidden={tool === "refinance"}>
            <MortgageCalculatorPage
              propertyDetails={propertyWorkspace}
              partnerPanel={
                <section className="fc-card fc-lender-panel">
                  <h2>
                    Preferred lender <small>(optional)</small>
                  </h2>
                  <p>
                    Your own lending partners, ready for client presentations.
                  </p>
                  <label className="fc-field">
                    <span>Select preferred lender</span>
                    <select
                      aria-label="Calculator preferred lender"
                      value={context.lenderId ?? ""}
                      onChange={(e) =>
                        patch({ lenderId: e.target.value || null })
                      }
                    >
                      <option value="">No lender selected</option>
                      {partners
                        .filter((p) => p.kind === "lender")
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.preferred ? " · Default" : ""}
                          </option>
                        ))}
                    </select>
                  </label>
                  {selectedPartners
                    .filter((p) => p.kind === "lender")
                    .map((p) => (
                      <div className="fc-lender-details" key={p.id}>
                        <span className="fc-icon">
                          <Icon name="account_balance" />
                        </span>
                        <div>
                          <b>{p.name}</b>
                          {p.contact && <p>{p.contact}</p>}
                          {p.phone && <p>{p.phone}</p>}
                          {p.license && <p>{p.license}</p>}
                        </div>
                      </div>
                    ))}
                  {!partners.some((p) => p.kind === "lender") && (
                    <p className="fc-muted">
                      {storageError
                        ? "Lender records are unavailable. Retry from Partners."
                        : "No lenders saved. Add your authorized lending partners."}
                    </p>
                  )}
                  <button onClick={() => changeTab("Partners")}>
                    <Icon name="manage_accounts" />
                    Manage lenders
                  </button>
                  <div className="fc-lender-footnote">
                    <Icon name="verified_user" />
                    <p>
                      Your choice, always. Partners are optional and rates
                      require lender confirmation.
                    </p>
                  </div>
                </section>
              }
              onReviewReport={() => {
                document
                  .getElementById("financing-estimate-review")
                  ?.scrollIntoView({
                    behavior: window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches
                      ? "auto"
                      : "smooth",
                    block: "start",
                  });
              }}
              initialEstimate={mortgageSeed}
              onEstimateChange={mortgageChanged}
            />
          </div>
          {tool === "refinance" && (
            <section className="fc-card">
              <h2>Refinance with perspective.</h2>
              <p>
                Compare remaining loan payments and the proposed term. Enter
                actual balances and verify lender closing costs.
              </p>
              <div className="fc-input-grid">
                {(
                  [
                    ["balance", "Current principal balance ($)"],
                    ["currentRate", "Current interest rate (%)"],
                    ["proposedRate", "Proposed rate (%)"],
                    ["remainingMonths", "Months remaining"],
                    ["newMonths", "Proposed months"],
                    ["cashOut", "Cash out ($)"],
                  ] as const
                ).map(([k, label]) => (
                  <NumberField
                    key={k}
                    label={label}
                    value={refi[k]}
                    onChange={(n) => {
                      setRefi({ ...refi, [k]: n });
                      setReviewed(false);
                    }}
                  />
                ))}
              </div>
              <label className="fc-check">
                <input
                  type="checkbox"
                  checked={refi.financeCosts}
                  onChange={(e) => {
                    setRefi({ ...refi, financeCosts: e.target.checked });
                    setReviewed(false);
                  }}
                />{" "}
                Finance closing costs into the new loan
              </label>
              <FeesEditor
                fees={refi.fees}
                onChange={(fees) => {
                  setRefi({ ...refi, fees });
                  setReviewed(false);
                }}
              />
            </section>
          )}
        </>
      )}
      {tab === "Seller Net Sheet" && (
        <section className="fc-card">
          <div className="fc-section-heading">
            <div>
              <h2>Know what comes next.</h2>
              <p>
                Transaction-specific seller proceeds. No standard compensation
                or local fee rate is assumed.
              </p>
            </div>
            <div className="fc-subtabs">
              <button
                aria-pressed={tool !== "reverse"}
                onClick={() => {
                  setTool("main");
                  setReviewed(false);
                }}
              >
                Net sheet
              </button>
              <button
                aria-pressed={tool === "reverse"}
                onClick={() => {
                  setTool("reverse");
                  setReviewed(false);
                }}
              >
                Seller to net
              </button>
            </div>
          </div>
          {tool === "reverse" && (
            <NumberField
              label="Target seller net ($)"
              value={targetNet}
              onChange={(n) => {
                setTargetNet(n);
                setReviewed(false);
              }}
            />
          )}
          <SellerInputs
            value={seller}
            onChange={(v) => {
              setSeller(v);
              setReviewed(false);
            }}
          />
          {tool === "reverse" && (
            <p className="fc-muted">
              The sale price field above is ignored in reverse mode. Re-check
              price-dependent fees at the calculated sale price.
            </p>
          )}
        </section>
      )}
      {tab === "Buyer Estimate" && (
        <section className="fc-card">
          <h2>A clearer cash-to-close picture.</h2>
          <p>
            Enter credits, deposits, closing fees and prepaid amounts. Zero
            values exclude an item.
          </p>
          <div className="fc-input-grid">
            {(
              [
                ["price", "Purchase price ($)"],
                ["downPayment", "Down payment ($)"],
                ["deposit", "Earnest money already paid ($)"],
                ["credits", "Lender / seller credits ($)"],
              ] as const
            ).map(([k, label]) => (
              <NumberField
                key={k}
                label={label}
                value={buyer[k]}
                onChange={(n) => {
                  setBuyer({ ...buyer, [k]: n });
                  setReviewed(false);
                }}
              />
            ))}
          </div>
          <FeesEditor
            fees={buyer.fees}
            onChange={(fees) => {
              setBuyer({ ...buyer, fees });
              setReviewed(false);
            }}
          />
        </section>
      )}
      {tab === "Compare Offers" && (
        <section className="fc-card">
          <div className="fc-section-heading">
            <div>
              <h2>Consider the whole offer.</h2>
              <p>
                Compare up to five offers. Estimated net does not account for
                execution risk.
              </p>
            </div>
            <button
              onClick={() => {
                setOfferRows([
                  ...offerRows,
                  {
                    ...startSeller(),
                    label: `Offer ${offerRows.length + 1}`,
                    financing: "",
                    closingDate: "",
                    contingencies: "",
                  },
                ]);
                setReviewed(false);
              }}
              disabled={offerRows.length >= 5}
            >
              + Add offer
            </button>
          </div>
          {offerRows.map((o, i) => (
            <details className="fc-offer" key={i} open={i === 0}>
              <summary>{o.label}</summary>
              <div className="fc-input-grid">
                <TextField
                  label="Offer label"
                  value={o.label}
                  onChange={(label) => {
                    setOfferRows(
                      offerRows.map((x, n) => (n === i ? { ...x, label } : x)),
                    );
                    setReviewed(false);
                  }}
                />
                <TextField
                  label="Financing terms"
                  value={o.financing}
                  onChange={(financing) => {
                    setOfferRows(
                      offerRows.map((x, n) =>
                        n === i ? { ...x, financing } : x,
                      ),
                    );
                    setReviewed(false);
                  }}
                />
                <TextField
                  label="Closing date"
                  type="date"
                  value={o.closingDate}
                  onChange={(closingDate) => {
                    setOfferRows(
                      offerRows.map((x, n) =>
                        n === i ? { ...x, closingDate } : x,
                      ),
                    );
                    setReviewed(false);
                  }}
                />
                <TextField
                  label="Contingencies"
                  value={o.contingencies}
                  onChange={(contingencies) => {
                    setOfferRows(
                      offerRows.map((x, n) =>
                        n === i ? { ...x, contingencies } : x,
                      ),
                    );
                    setReviewed(false);
                  }}
                />
              </div>
              <SellerInputs
                value={o}
                onChange={(v) => {
                  setOfferRows(
                    offerRows.map((x, n) => (n === i ? { ...x, ...v } : x)),
                  );
                  setReviewed(false);
                }}
              />
              {offerRows.length > 1 && (
                <button
                  onClick={() => {
                    setOfferRows(offerRows.filter((_, n) => n !== i));
                    setReviewed(false);
                  }}
                >
                  Remove offer
                </button>
              )}
            </details>
          ))}
        </section>
      )}
      {tab === "Partners" && (
        <section className="fc-card">
          <div className="fc-section-heading">
            <div>
              <h2>Your trusted professionals.</h2>
              <p>
                Lenders and title companies are separate records. Default
                selection never implies exclusivity.
              </p>
            </div>
            <div className="fc-actions">
              <button onClick={() => newPartner("lender")}>+ Add lender</button>
              <button onClick={() => newPartner("title")}>
                + Add title company
              </button>
            </div>
          </div>
          {(["lender", "title"] as const).map((kind) => (
            <div key={kind}>
              <h3>{kind === "lender" ? "Lenders" : "Title companies"}</h3>
              <div className="fc-partners">
                {partners
                  .filter((p) => p.kind === kind)
                  .map((p) => (
                    <article className="fc-partner" key={p.id}>
                      <span className="fc-icon">
                        <Icon
                          name={
                            kind === "lender"
                              ? "account_balance"
                              : "verified_user"
                          }
                        />
                      </span>
                      <div>
                        <h4>
                          {p.name}
                          {p.preferred && <small>Default</small>}
                        </h4>
                        <p>
                          {[p.contact, p.phone, p.email]
                            .filter(Boolean)
                            .join(" · ") || "No contact details entered"}
                        </p>
                        <p>{p.serviceAreas || "No service area provided"}</p>
                        {p.license && <p>License: {p.license}</p>}
                        <p>
                          {p.feeReference
                            ? `Quote reference: ${p.feeReference}`
                            : "No authorized fee schedule on file"}
                        </p>
                        <div className="fc-actions">
                          <button
                            onClick={() => {
                              setEditor(PartnerSchema.parse(p));
                              setPartnerError("");
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  `Remove ${p.name}? Existing saved report snapshots remain unchanged.`,
                                )
                              )
                                return;
                              try {
                                await request(
                                  `/api/financing/partners?id=${p.id}`,
                                  "DELETE",
                                );
                                patch(
                                  p.kind === "lender"
                                    ? {
                                        lenderId:
                                          context.lenderId === p.id
                                            ? null
                                            : context.lenderId,
                                      }
                                    : {
                                        titleId:
                                          context.titleId === p.id
                                            ? null
                                            : context.titleId,
                                      },
                                );
                                setRefresh((v) => v + 1);
                              } catch {
                                setNotice(
                                  "Partner could not be removed. Retry.",
                                );
                              }
                            }}
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => {
                              patch(
                                p.kind === "lender"
                                  ? { lenderId: p.id }
                                  : { titleId: p.id },
                              );
                              setNotice(
                                `${p.name} selected for the current report.`,
                              );
                            }}
                          >
                            Use for report
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
              {!partners.some((p) => p.kind === kind) && (
                <p className="fc-empty">
                  {storageError
                    ? "Partner records unavailable."
                    : `No ${kind === "lender" ? "lenders" : "title companies"} saved yet. Add your own authorized contacts.`}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
      {tab === "Resources" && (
        <section className="fc-card">
          <div className="fc-section-heading">
            <div>
              <h2>Preparation makes a difference.</h2>
              <p>
                Tools and authoritative resources for a more informed closing
                conversation.
              </p>
            </div>
            <button
              aria-pressed={tool === "fees"}
              onClick={() => {
                setTool(tool === "fees" ? "main" : "fees");
                setReviewed(false);
              }}
            >
              Closing fee calculator
            </button>
          </div>
          {tool === "fees" ? (
            <FeesEditor
              fees={feeRows}
              onChange={(fees) => {
                setFeeRows(fees);
                setReviewed(false);
              }}
            />
          ) : (
            <div className="fc-resource-grid">
              {[
                {
                  title: "Understand closing costs",
                  url: "https://www.consumerfinance.gov/owning-a-home/closing-disclosure/",
                  description: "CFPB guidance on the Closing Disclosure.",
                },
                {
                  title: "Compare mortgage offers",
                  url: "https://www.consumerfinance.gov/owning-a-home/loan-estimate/",
                  description: "Review official lender Loan Estimates.",
                },
                {
                  title: "Choose settlement services",
                  url: "https://www.consumerfinance.gov/owning-a-home/",
                  description: "Shop for services and review your options.",
                },
              ].map((r) => (
                <a
                  key={r.url}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="menu_book" />
                  <h3>{r.title}</h3>
                  <p>{r.description}</p>
                  <span>Read resource ↗</span>
                </a>
              ))}
            </div>
          )}
          <p className="fc-muted">
            No title provider is connected. Official premiums, county taxes and
            recording charges require an authorized quote or current published
            schedule. State and county entries identify assumptions; they do not
            automatically set fee rates.
          </p>
        </section>
      )}
      {raw && (
        <section
          id="financing-estimate-review"
          className="fc-card fc-estimate"
          tabIndex={-1}
        >
          <div className="fc-section-heading">
            <div>
              <span className="fc-eyebrow">YOUR ESTIMATE</span>
              <h2>{result?.totalLabel ?? "Complete your assumptions."}</h2>
              {result && (
                <strong className="fc-total">{usd(result.total)}</strong>
              )}
            </div>
            <span className="fc-icon">
              <Icon name="calculate" />
            </span>
          </div>
          {result ? (
            <>
              <div className="fc-result-lines">
                {result.lines.map((l, i) => (
                  <div key={i}>
                    <span>{l.label}</span>
                    <b>{usd(l.amount)}</b>
                  </div>
                ))}
              </div>
              {result.details.map((d, i) => (
                <p key={i}>
                  <b>{d.label}:</b> {d.value}
                </p>
              ))}
              <label className="fc-check">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />{" "}
                I have reviewed the inputs, omitted fees, sources and
                assumptions for this estimate.
              </label>
              <div className="fc-actions">
                <button
                  className="fc-primary"
                  disabled={!reviewed}
                  onClick={() => setPreview(true)}
                >
                  Preview / create report
                </button>
                <button
                  disabled={!reviewed || busy || storageError}
                  onClick={() => void saveReport()}
                >
                  {busy ? "Saving…" : "Save to client / report library"}
                </button>
              </div>
            </>
          ) : (
            <p role="status">
              Enter a positive price or loan balance and valid required amounts.
              Sourced fees need a reference and effective date. Down payments
              cannot exceed the price.
            </p>
          )}
          <button
            disabled={!reviewed}
            onClick={() =>
              openAssistant({
                task: "note_summary",
                context: {
                  ...(client
                    ? { contactId: client.id, contactName: client.first_name }
                    : {}),
                  tone: "professional",
                  goal: "Explain this verified estimate in plain language. Never change or invent financial figures, guarantees or partner endorsements. This is draft copy for subscriber review.",
                },
                brief: lines.join("\n").slice(0, 3500),
              })
            }
          >
            AI explanation draft
          </button>
          <p className="fc-disclosure">{DISCLOSURE}</p>
        </section>
      )}
      <section className="fc-card">
        <div className="fc-section-heading">
          <div>
            <h2>Keep the relationship moving.</h2>
            <p>
              Use existing MyARI workflows. Nothing is sent, enrolled or
              scheduled automatically.
            </p>
          </div>
        </div>
        <div className="fc-actions">
          {client ? (
            <>
              <Link href={financingLinks(client.id).profile}>
                Open contact profile →
              </Link>
              <Link href={financingLinks(client.id).property}>
                Property Finder →
              </Link>
              <Link href={financingLinks(client.id).calendar}>
                Schedule appointment →
              </Link>
              <Link href="/dashboard/campaigns">Choose a campaign →</Link>
              <button
                onClick={() =>
                  openAssistant({
                    task: "email_writer",
                    context: {
                      contactId: client.id,
                      contactName: [client.first_name, client.last_name]
                        .filter(Boolean)
                        .join(" "),
                      tone: "professional",
                      goal: "Prepare a follow-up about the reviewed financing estimate. Do not invent figures, rates or approval.",
                    },
                    brief: lines.length
                      ? lines.join("\n").slice(0, 3500)
                      : "Ask the client about their financing questions. No estimate has been finalized.",
                  })
                }
              >
                Prepare email
              </button>
              <button
                onClick={() =>
                  openAssistant({
                    task: "sms_writer",
                    context: {
                      contactId: client.id,
                      contactName: client.first_name,
                      tone: "professional",
                      goal: "Prepare a brief follow-up about financing questions without promising rates or approval.",
                    },
                    brief:
                      "Invite the client to review their financing questions. Do not send or invent financial figures.",
                  })
                }
              >
                Prepare SMS
              </button>
            </>
          ) : (
            <p>Select a client to connect a property, report and follow-up.</p>
          )}
        </div>
        {client && (
          <details className="fc-context-details">
            <summary>Follow-up tasks for {client.first_name}</summary>
            <ContactTasksPanel key={client.id} contactId={client.id} />
          </details>
        )}
      </section>
      <section className="fc-card">
        <div className="fc-section-heading">
          <h2>Saved reports</h2>
          <span className="fc-muted">
            Most recent 100 · original calculation snapshots
          </span>
        </div>
        {reports.length ? (
          <div className="fc-report-library">
            {reports.map((r) => (
              <article key={r.id}>
                <div>
                  <h3>
                    {r.payload.context.reportTitle || r.payload.result.title}
                  </h3>
                  <p>
                    {r.payload.context.address || "Property not provided"} ·{" "}
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                  <b>{usd(r.payload.result.total)}</b>
                </div>
                <div className="fc-actions">
                  <button onClick={() => openReport(r)}>
                    Open assumptions
                  </button>
                  <button
                    onClick={() => {
                      const p = r.payload;
                      const oldPartners = p.partners.map((x) => ({
                        ...x.payload,
                        id: x.id,
                        kind: x.kind as Partner["kind"],
                      }));
                      const l = reportLines(
                        p.calculation,
                        p.context,
                        p.branding,
                        oldPartners,
                        p.client ??
                          contacts.find((c) => c.id === p.context.contactId),
                      );
                      downloadReport(
                        reportPdf(l).buffer as ArrayBuffer,
                        `myari-${r.id}.pdf`,
                        "application/pdf",
                      );
                    }}
                  >
                    Download saved PDF
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="fc-empty">
            {storageError
              ? "Saved reports could not be loaded."
              : "No saved reports yet. Review an estimate to save your first report."}
          </p>
        )}
      </section>
      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        title="Review your MyARI report"
        size="xl"
      >
        <div className="fc-report-preview">
          <Image
            unoptimized
            width={100}
            height={70}
            src="/brand/myari-logo.png"
            alt="MyARI"
            onError={(e) => {
              e.currentTarget.hidden = true;
            }}
          />
          {branding.headshot?.startsWith("https://") && (
            <Image
              unoptimized
              width={70}
              height={70}
              src={branding.headshot}
              alt={branding.name || "Realtor"}
            />
          )}
          {selectedPartners
            .filter((p) => p.brandingAuthorized && p.logoUrl)
            .map((p) => (
              <Image
                unoptimized
                width={100}
                height={70}
                key={p.id}
                src={p.logoUrl}
                alt={`${p.name} authorized branding`}
              />
            ))}
          {lines.map((line, i) =>
            i === 0 ? (
              <h2 key={i}>{line}</h2>
            ) : (
              <p key={i}>{line || "\u00a0"}</p>
            ),
          )}
        </div>
        <p className="fc-muted">
          To edit figures, close this preview and change the calculator. Figures
          always use the calculation engine. Sharing requires your approval and
          manual attachment in your existing messaging workflow.
        </p>
        <div className="fc-actions">
          <button
            className="fc-primary"
            onClick={() =>
              downloadReport(
                reportPdf(lines).buffer as ArrayBuffer,
                "myari-financing-estimate.pdf",
                "application/pdf",
              )
            }
          >
            Download PDF
          </button>
          <button
            onClick={() =>
              downloadReport(
                reportSvg(lines),
                "myari-financing-estimate.svg",
                "image/svg+xml",
              )
            }
          >
            Download report image
          </button>
          <button onClick={() => setPreview(false)}>Edit assumptions</button>
          {client && (
            <button
              onClick={async () => {
                try {
                  if (
                    !window.confirm(
                      "Copy this report for your client? Review it before attaching or sending through your existing email or SMS workflow.",
                    )
                  )
                    return;
                  await navigator.clipboard.writeText(lines.join("\n"));
                  setNotice(
                    "Report copied. Open the contact profile to prepare your message; nothing has been sent.",
                  );
                  setPreview(false);
                } catch {
                  setNotice(
                    "Clipboard unavailable. Download the PDF to attach manually.",
                  );
                }
              }}
            >
              Copy for sharing
            </button>
          )}
        </div>
      </Modal>
      <Modal
        open={!!editor}
        onClose={() => setEditor(null)}
        title={editor?.id ? "Edit preferred partner" : "Add preferred partner"}
        size="lg"
      >
        {editor && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void savePartner();
            }}
          >
            <label className="fc-field">
              <span>Partner type</span>
              <select
                value={editor.kind}
                onChange={(e) =>
                  setEditor({
                    ...editor,
                    kind: e.target.value as Partner["kind"],
                  })
                }
              >
                <option value="lender">Lender</option>
                <option value="title">Title company</option>
              </select>
            </label>
            <div className="fc-input-grid">
              {(
                [
                  ["name", "Company name"],
                  ["contact", "Contact person"],
                  ["email", "Email"],
                  ["phone", "Phone"],
                  ["address", "Office address"],
                  ["website", "Website (HTTPS)"],
                  ["logoUrl", "Authorized logo URL (HTTPS)"],
                  ["serviceAreas", "Service areas / counties"],
                  ["license", "License / NMLS information"],
                  [
                    "feeReference",
                    "Authorized fee schedule or quote reference",
                  ],
                ] as const
              ).map(([k, label]) => (
                <TextField
                  key={k}
                  label={label}
                  value={editor[k]}
                  onChange={(v) => setEditor({ ...editor, [k]: v })}
                />
              ))}
            </div>
            <label className="fc-field">
              <span>Notes</span>
              <textarea
                value={editor.notes}
                onChange={(e) =>
                  setEditor({ ...editor, notes: e.target.value })
                }
              />
            </label>
            <label className="fc-check">
              <input
                type="checkbox"
                checked={editor.preferred}
                onChange={(e) =>
                  setEditor({ ...editor, preferred: e.target.checked })
                }
              />{" "}
              Default for this partner type
            </label>
            <label className="fc-check">
              <input
                type="checkbox"
                checked={editor.brandingAuthorized}
                onChange={(e) =>
                  setEditor({ ...editor, brandingAuthorized: e.target.checked })
                }
              />{" "}
              I have permission to use this partner’s branding in reports
            </label>
            {partnerError && <p role="alert">{partnerError}</p>}
            <button type="submit" className="fc-primary" disabled={busy}>
              {busy ? "Saving…" : "Save partner"}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
