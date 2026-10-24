"use client";
import { AuthorizedVoicePreference } from "./authorized-voice-preference";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { UserSettings } from "@/lib/settings/types";
import {
  BrandKitSchema,
  emptyBrandKit,
  type BrandKit,
} from "@/lib/settings/brand-kit";
export function BrandKitPanel({
  settings,
  onChange,
}: {
  settings: UserSettings;
  onChange: (kit: BrandKit) => void;
}) {
  const parsed = BrandKitSchema.safeParse(settings.brandKit);
  const kit = parsed.success ? parsed.data : emptyBrandKit();
  const [images, setImages] = useState({ headshot: "", logo: "" }),
    [notice, setNotice] = useState(""),
    [uploading, setUploading] = useState(false),
    [preview, setPreview] = useState("Real estate flyer");
  const [steps, setSteps] = useState<
      { id: string; title: string; done: boolean; href: string }[]
    >([]),
    [setupError, setSetupError] = useState(""),
    [partners, setPartners] = useState<
      {
        id: string;
        name: string;
        company: string;
        kind: string;
        brandingAuthorized: boolean;
      }[]
    >([]);
  const [aiMode, setAiMode] = useState("Professional bio"),
    [aiDraft, setAiDraft] = useState(""),
    [aiBusy, setAiBusy] = useState(false);
  const edit = (patch: Partial<BrandKit>) =>
    onChange({ ...kit, ...patch, approved: false });
  useEffect(() => {
    let live = true;
    void fetch("/api/settings/brand-kit")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (live && j)
          setImages({ headshot: j.headshotUrl || "", logo: j.logoUrl || "" });
      });
    void fetch("/api/settings/onboarding")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw Error();
        if (live) setSteps(j.steps ?? []);
      })
      .catch(() => {
        if (live)
          setSetupError(
            "Setup progress could not be fully verified. Configure each service before marking setup complete.",
          );
      });
    void fetch("/api/financing/partners")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (live) setPartners(j?.data?.partners ?? j?.partners ?? []);
      });
    return () => {
      live = false;
    };
  }, [settings.updatedAt]);
  const upload = async (file: File, kind: "headshot" | "logo") => {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 4 * 1024 * 1024
    ) {
      setNotice("Choose a JPG, PNG or WebP image smaller than 4 MB.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/settings/brand-kit/assets", {
        method: "POST",
        body: form,
      });
      const j = await r.json();
      if (!r.ok) throw Error();
      edit({ [kind === "headshot" ? "headshotPath" : "logoPath"]: j.path });
      setImages((old) => ({ ...old, [kind]: j.url }));
      setNotice(
        "Image uploaded privately. Review and save your Brand Kit to use it.",
      );
    } catch {
      setNotice(
        "Image upload failed. Your current saved branding is unchanged.",
      );
    } finally {
      setUploading(false);
    }
  };
  const assist = async () => {
    setAiBusy(true);
    try {
      const r = await fetch("/api/settings/brand-kit/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: aiMode, kit }),
      });
      const j = await r.json();
      if (!r.ok) throw Error();
      setAiDraft(j.draft);
    } catch {
      setNotice(
        "AI setup assistance is unavailable. You can edit every field manually.",
      );
    } finally {
      setAiBusy(false);
    }
  };
  const completed = steps.filter((s) => s.done).length;
  const fields: [keyof BrandKit, string][] = [
    ["agentName", "Agent name"],
    ["jobTitle", "Professional title"],
    ["businessName", "Business / brokerage name"],
    ["phone", "Business phone"],
    ["email", "Business email"],
    ["website", "Website (https)"],
    ["zillowReviewUrl", "Zillow Review Link"],
    ["address", "Business address"],
    ["licenseNumber", "Real estate license number"],
  ];
  return (
    <div className="brand-kit">
      <section className="brand-card">
        <h2>Your professional identity.</h2>
        <p>
          Approved branding for client-facing materials. Nothing is published or
          shared automatically.
        </p>
        <div className="brand-fields">
          {fields.map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={String(kit[key] ?? "")}
                onChange={(e) => edit({ [key]: e.target.value })}
                maxLength={300}
              />
            </label>
          ))}
        </div>
        <label><input type="checkbox" checked={kit.reviewRequestsEnabled ?? true} onChange={e=>edit({reviewRequestsEnabled:e.target.checked})}/> Enable review invitations (independent of referral nurturing)</label>
        {kit.zillowReviewUrl && /^https:\/\/(www\.)?zillow\.com\/reviews\/write\//.test(kit.zillowReviewUrl) && <a href={kit.zillowReviewUrl} target="_blank" rel="noopener noreferrer">Preview your Zillow review destination ↗</a>}
        <AuthorizedVoicePreference value={kit.preferredAiVoiceProfileId ?? null} onChange={id=>edit({preferredAiVoiceProfileId:id})}/>
        <div className="brand-images">
          {(["headshot", "logo"] as const).map((kind) => (
            <div key={kind}>
              <h3>
                {kind === "headshot"
                  ? "Professional headshot"
                  : "Brokerage / company logo"}
              </h3>
              {images[kind] ? (
                <Image
                  unoptimized
                  src={images[kind]}
                  width={100}
                  height={100}
                  alt={
                    kind === "headshot"
                      ? "Your professional headshot"
                      : "Your company logo"
                  }
                  style={{ objectFit: "contain", height: 100, width: 100 }}
                />
              ) : (
                <div className="brand-image-empty">No image saved</div>
              )}
              <label>
                Upload / replace
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file, kind);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  edit({
                    [kind === "headshot" ? "headshotPath" : "logoPath"]: "",
                  });
                  setImages((old) => ({ ...old, [kind]: "" }));
                }}
              >
                Remove from Brand Kit
              </button>
            </div>
          ))}
        </div>
        {settings.profile.avatarUrl?.startsWith("https://") && (
          <label className="brand-check">
            <input
              type="checkbox"
              checked={kit.useProfilePhoto}
              onChange={(e) => edit({ useProfilePhoto: e.target.checked })}
            />
            Reuse my existing profile photo
          </label>
        )}
        <div className="brand-fields">
          <label>
            Primary brand color
            <input
              type="color"
              value={kit.primaryColor}
              onChange={(e) => edit({ primaryColor: e.target.value })}
            />
          </label>
          <label>
            Secondary brand color
            <input
              type="color"
              value={kit.secondaryColor}
              onChange={(e) => edit({ secondaryColor: e.target.value })}
            />
          </label>
          <label>
            Preferred font
            <select
              value={kit.font}
              onChange={(e) =>
                edit({ font: e.target.value as BrandKit["font"] })
              }
            >
              {["Georgia", "Arial", "Inter", "Cormorant Garamond"].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Professional bio
          <textarea
            rows={4}
            value={kit.bio}
            onChange={(e) => edit({ bio: e.target.value })}
            maxLength={3000}
          />
        </label>
        <label>
          Brokerage information
          <textarea
            rows={2}
            value={kit.brokerageInfo}
            onChange={(e) => edit({ brokerageInfo: e.target.value })}
          />
        </label>
        <label>
          Required advertising disclosures
          <textarea
            rows={3}
            value={kit.disclosures}
            onChange={(e) => edit({ disclosures: e.target.value })}
          />
        </label>
        <div className="brand-fields">
          {(["instagram", "facebook", "linkedin"] as const).map((key) => (
            <label key={key}>
              {key}
              <input
                type="url"
                value={kit.socials[key]}
                onChange={(e) =>
                  edit({ socials: { ...kit.socials, [key]: e.target.value } })
                }
                placeholder="https://"
              />
            </label>
          ))}
        </div>
        <label className="brand-check">
          <input
            type="checkbox"
            checked={kit.approved}
            onChange={(e) => onChange({ ...kit, approved: e.target.checked })}
          />
          I reviewed these details and have permission to use the supplied
          images, brokerage identity and disclosures.
        </label>
        <p>
          Use Save changes below to persist this version across devices. Editing
          any branding field requires review again.
        </p>
        {notice && (
          <p role="status" className="brand-notice">
            {notice}
          </p>
        )}
      </section>
      <section className="brand-card">
        <h2>Brand preview</h2>
        <div className="brand-preview-tabs">
          {[
            "Real estate flyer",
            "Mortgage estimate",
            "Seller net sheet",
            "Email signature",
            "Buyer presentation",
          ].map((t) => (
            <button
              type="button"
              key={t}
              aria-pressed={preview === t}
              onClick={() => setPreview(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div
          className="brand-preview"
          style={{
            borderTopColor: kit.primaryColor,
            fontFamily: kit.font,
            background: kit.secondaryColor,
          }}
        >
          <small>
            DESIGN PREVIEW ONLY · No actual property or financial estimate
          </small>
          {images.logo && (
            <Image
              unoptimized
              src={images.logo}
              alt="Company branding preview"
              width={95}
              height={70}
              style={{ objectFit: "contain" }}
            />
          )}
          <h3>{preview}</h3>
          <h4>{kit.businessName || "Add your business name"}</h4>
          <p>
            {kit.agentName} {kit.jobTitle && `· ${kit.jobTitle}`}
          </p>
          <p>
            {kit.phone} {kit.email && `· ${kit.email}`}
          </p>
          <p>{kit.website}</p>
          <p>{kit.bio}</p>
          <small>
            {kit.licenseNumber && `License ${kit.licenseNumber}`}{" "}
            {kit.disclosures}
          </small>
        </div>
        <p>
          Supported financing reports use approved saved branding. These
          previews do not create, publish, send, or share materials.
        </p>
      </section>
      <section className="brand-card">
        <h2>Preferred partner branding</h2>
        {partners.length ? (
          partners.map((p) => (
            <p key={p.id}>
              {p.name} · {p.company} · {p.kind} ·{" "}
              {p.brandingAuthorized
                ? "Branding permission recorded"
                : "Branding not authorized"}
            </p>
          ))
        ) : (
          <p>
            No saved partners were returned. Add your authorized lender and
            title contacts in Financing & Closing.
          </p>
        )}
        <Link href="/dashboard/mortgage">
          Manage lenders and title partners →
        </Link>
      </section>
      <section className="brand-card">
        <h2>Smart setup assistance</h2>
        <label>
          Draft type
          <select value={aiMode} onChange={(e) => setAiMode(e.target.value)}>
            {[
              "Professional bio",
              "Email signature",
              "Brand colors",
              "Campaign introduction",
              "Explain setup",
            ].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <button type="button" disabled={aiBusy} onClick={() => void assist()}>
          {aiBusy ? "Preparing…" : "Prepare editable suggestion"}
        </button>
        {aiDraft && (
          <>
            <textarea
              aria-label="AI brand suggestion"
              value={aiDraft}
              rows={5}
              onChange={(e) => setAiDraft(e.target.value)}
            />
            <p>
              Review facts and licensing information. Suggestions are never
              saved automatically.
            </p>
            {aiMode === "Professional bio" && (
              <button
                type="button"
                onClick={() => {
                  edit({ bio: aiDraft });
                  setAiDraft("");
                }}
              >
                Apply to bio draft
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard
                  .writeText(aiDraft)
                  .catch(() =>
                    setNotice(
                      "Copy failed. Select the text and copy manually.",
                    ),
                  )
              }
            >
              Copy reviewed text
            </button>
          </>
        )}
      </section>
      <section className="brand-card">
        <h2>Your next chapter, thoughtfully set up.</h2>
        {kit.onboardingDismissed ? (
          <button
            onClick={() => onChange({ ...kit, onboardingDismissed: false })}
          >
            Show setup checklist
          </button>
        ) : (
          <>
            {setupError ? (
              <p>{setupError}</p>
            ) : (
              <>
                <p>
                  {completed} of {steps.length} verified steps ·{" "}
                  {steps.length
                    ? Math.round((completed / steps.length) * 100)
                    : 0}
                  % complete
                </p>
                <progress max={steps.length || 1} value={completed} />
                {steps.find((s) => !s.done) && (
                  <p>
                    Recommended next step:{" "}
                    <Link href={steps.find((s) => !s.done)!.href}>
                      {steps.find((s) => !s.done)!.title} →
                    </Link>
                  </p>
                )}
                {steps.find((s) => !s.done) && (
                  <p>
                    Recommended next step:{" "}
                    <Link href={steps.find((s) => !s.done)!.href}>
                      {steps.find((s) => !s.done)!.title} →
                    </Link>
                  </p>
                )}
                {steps.map((step) => (
                  <Link
                    className="brand-setup-step"
                    key={step.id}
                    href={step.href}
                  >
                    <span>{step.done ? "✓" : "○"}</span>
                    {step.title}
                    <span>→</span>
                  </Link>
                ))}
              </>
            )}
            <label className="brand-check">
              <input
                type="checkbox"
                checked={kit.personalizationReviewed}
                onChange={(e) =>
                  onChange({
                    ...kit,
                    personalizationReviewed: e.target.checked,
                  })
                }
              />
              I reviewed campaign personalization settings.
            </label>
            <label className="brand-check">
              <input
                type="checkbox"
                checked={kit.notificationsReviewed}
                onChange={(e) =>
                  onChange({ ...kit, notificationsReviewed: e.target.checked })
                }
              />
              I reviewed notification preferences.
            </label>
            <button
              type="button"
              onClick={() => onChange({ ...kit, onboardingDismissed: true })}
            >
              Dismiss checklist after saving
            </button>
          </>
        )}
      </section>
    </div>
  );
}
