"use client";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/crm/modal";
import {
  MortgagePdfPreferencesSchema,
  type MortgagePdfPreferences,
} from "@/lib/financing/pdf-preferences";
import type { MortgagePdfInput } from "@/lib/financing/mortgage-pdf-model";
import { downloadReport } from "@/lib/financing/reports";
export function MortgagePdfPreview({
  input,
  onClose,
}: {
  input: MortgagePdfInput;
  onClose: () => void;
}) {
  const [preferences, setPreferences] = useState<MortgagePdfPreferences>(() =>
    MortgagePdfPreferencesSchema.parse(
      input.preferences ?? input.branding.pdfPreferences ?? {},
    ),
  );
  const [url, setUrl] = useState(""),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [warning, setWarning] = useState("");
  const file = useRef<{ bytes: Uint8Array; name: string } | null>(null);
  useEffect(() => {
    let active = true,
      objectUrl = "";
    setBusy(true);
    setError("");
    setUrl("");
    file.current = null;
    import("@/lib/financing/mortgage-pdf-browser")
      .then(async (m) => {
        const current = { ...input, preferences };
        const result = await m.mortgagePdfBrowser(current);
        if (!active) return;
        file.current = {
          bytes: result.bytes,
          name: m.mortgagePdfFilename(current),
        };
        objectUrl = URL.createObjectURL(
          new Blob([result.bytes.buffer as ArrayBuffer], {
            type: "application/pdf",
          }),
        );
        setUrl(objectUrl);
        setWarning(result.imageWarning);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "PDF unavailable. Your inputs are unchanged.",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [input, preferences]);
  return (
    <Modal
      open
      onClose={onClose}
      title="Your mortgage presentation"
      size="xl"
      className="fc-luxury-pdf-modal"
    >
      <div className="fc-pdf-tools">
        <label>
          Report branding
          <select
            aria-label="PDF branding template"
            value={preferences.template}
            onChange={(e) =>
              setPreferences((p) => ({
                ...p,
                template: e.target.value as MortgagePdfPreferences["template"],
              }))
            }
          >
            <option value="myari">MyARI luxury</option>
            <option value="agent">Agent branded</option>
            <option value="cobranded">Agent & lender</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.imagery}
            onChange={(e) =>
              setPreferences((p) => ({ ...p, imagery: e.target.checked }))
            }
          />
          Architectural imagery
        </label>
      </div>
      <p className="fc-muted">
        Two US Letter pages. Exact calculator amounts, illustrative assumptions,
        and your selected team. Save reusable defaults in Settings → Brand Kit.
      </p>
      {busy && <p role="status">Preparing your two-page PDF…</p>}
      {error && <p role="alert">{error}</p>}
      {warning && <p role="status">{warning}</p>}
      {url && (
        <>
          <iframe
            title="Two-page mortgage PDF preview"
            src={url + "#view=FitH"}
            className="fc-pdf-frame"
          />
          <div className="fc-actions">
            <a href={url} target="_blank" rel="noopener noreferrer">
              Open full PDF preview ↗
            </a>
            <button
              className="fc-primary"
              onClick={() => {
                const f = file.current;
                if (f)
                  downloadReport(
                    f.bytes.buffer as ArrayBuffer,
                    f.name,
                    "application/pdf",
                  );
              }}
            >
              Download PDF
            </button>
          </div>
        </>
      )}
      <p className="fc-muted">
        Review before sharing. This does not save, send, enroll contacts, or
        change billing. All imagery is architectural inspiration unless an
        authorized subject-property image is available.
      </p>
    </Modal>
  );
}
