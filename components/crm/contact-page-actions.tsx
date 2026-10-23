"use client";

import { AddContactModal } from "@/components/crm/add-contact-modal";
import { ImportCsvModal } from "@/components/crm/import-csv-modal";
import { useState } from "react";

type ContactPageActionsProps = {
  onRefresh?: () => void;
  variant?: "header" | "compact";
};

export function ContactPageActions({ onRefresh, variant = "header" }: ContactPageActionsProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const btnSecondary =
    variant === "compact"
      ? "flex h-10 items-center gap-2 rounded-full border border-outline-variant/40 bg-ivory px-4 text-[13px] font-medium text-ink"
      : "flex h-12 items-center gap-2 rounded-full border border-outline-variant/40 bg-ivory px-6 text-[14px] font-medium text-ink hover:bg-champagne transition-colors";

  const btnPrimary =
    variant === "compact"
      ? "flex h-10 items-center gap-2 rounded-full bg-rose-gold px-4 text-[13px] font-medium text-ivory"
      : "flex h-12 items-center gap-2 rounded-full bg-rose-gold px-6 text-[14px] font-medium text-ivory shadow-card hover:opacity-90 transition-opacity";

  return (
    <>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
        <button
          type="button"
          className={`${btnSecondary} w-full justify-center sm:w-auto`}
          onClick={() => setImportOpen(true)}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">upload</span>
          Import CSV
        </button>
        <button
          type="button"
          className={`${btnPrimary} order-first w-full justify-center sm:order-none sm:w-auto`}
          onClick={() => setAddOpen(true)}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">person_add</span>
          Add contact
        </button>
      </div>

      <AddContactModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={onRefresh}
      />
      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={onRefresh}
      />
    </>
  );
}
