"use client";

import {
  Modal,
  ModalFooterActions,
} from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useRef, useState } from "react";

type ImportCsvModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

type ImportResult = {
  imported: number;
  errors: { row: number; error: string }[];
};

const SAMPLE_CSV = `firstName,lastName,phone,email,consent,source
Jane,Doe,+15551234567,jane@example.com,Yes,Website
John,Smith,+15559876543,,Unknown,Referral`;

export function ImportCsvModal({ open, onClose, onSuccess }: ImportCsvModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setFile(null);
    setError(null);
    setResult(null);
    setDragOver(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickFile = (next: File | null) => {
    if (!next) {
      setFile(null);
      return;
    }
    if (!next.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a .csv file.");
      return;
    }
    setError(null);
    setFile(next);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "voicereach-contacts-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/contacts/import", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Import failed");
      }

      setResult({
        imported: data.imported ?? 0,
        errors: data.errors ?? [],
      });

      if ((data.imported ?? 0) > 0) {
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import contacts"
      description="CSV must include firstName and phone. Optional: lastName, email, consent, source."
      icon="upload_file"
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={handleClose}
          cancelLabel={result ? "Done" : "Cancel"}
          primaryLabel={result ? "Import another" : "Import CSV"}
          onPrimary={
            result
              ? () => {
                  reset();
                }
              : handleImport
          }
          primaryDisabled={!result && (submitting || !file)}
          primaryLoading={submitting}
        />
      }
    >
      <div className="space-y-5">
        <div
          className={cn(
            "rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
            dragOver
              ? "border-rose-gold bg-rose-gold/5"
              : file
                ? "border-emerald-muted/40 bg-sage-light/30"
                : "border-outline-variant/30 bg-cream/50",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickFile(e.dataTransfer.files[0] ?? null);
          }}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-gold/15 text-rose-gold-deep">
            <Icon name={file ? "description" : "upload_file"} className="text-[32px]" />
          </div>
          <p className="mt-4 text-[15px] font-medium text-ink">
            {file ? file.name : "Drop your CSV here"}
          </p>
          <p className="mt-1 text-[13px] text-taupe">
            {file ? `${(file.size / 1024).toFixed(1)} KB` : "or choose a file from your device"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            id="csv-file-input"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-outline-variant/30 bg-ivory px-5 text-[14px] font-medium text-ink shadow-sm hover:bg-champagne"
          >
            <Icon name="folder_open" className="text-[18px]" />
            Browse files
          </button>
        </div>

        <button
          type="button"
          onClick={downloadSample}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/20 bg-champagne/40 py-3 text-[13px] font-medium text-rose-gold-deep transition-colors hover:bg-champagne"
        >
          <Icon name="download" className="text-[18px]" />
          Download sample template
        </button>

        {error ? (
          <p
            className="rounded-xl border border-error/20 bg-error-container/25 px-4 py-3 text-[14px] text-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="rounded-xl border border-emerald-muted/25 bg-sage-light/40 px-4 py-4">
            <p className="flex items-center gap-2 font-medium text-emerald-muted">
              <Icon name="check_circle" className="text-[20px]" />
              Imported {result.imported} contact{result.imported === 1 ? "" : "s"}
            </p>
            {result.errors.length > 0 ? (
              <ul className="mt-3 max-h-28 space-y-1 overflow-y-auto text-[13px] text-taupe">
                {result.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>
                    Row {err.row}: {err.error}
                  </li>
                ))}
                {result.errors.length > 5 ? (
                  <li>…and {result.errors.length - 5} more rows skipped</li>
                ) : null}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
