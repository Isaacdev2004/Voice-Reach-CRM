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

  const btnSecondary = `premium-button premium-button--secondary ${variant === "compact" ? "!min-h-10 !px-4 !text-[13px]" : ""}`;
  const btnPrimary = `premium-button premium-button--primary ${variant === "compact" ? "!min-h-10 !px-4 !text-[13px]" : ""}`;

  return (
    <>
      <div className="contact-page-actions flex flex-wrap gap-2.5">
        <button type="button" className={btnSecondary} onClick={() => setImportOpen(true)}>
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">upload</span>
          Import CSV
        </button>
        <button type="button" className={btnPrimary} onClick={() => setAddOpen(true)}>
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
