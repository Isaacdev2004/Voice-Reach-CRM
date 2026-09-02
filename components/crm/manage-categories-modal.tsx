"use client";

import { Modal, ModalField, ModalFooterActions, modalInputClass } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import { useEffect, useState } from "react";

type ManageCategoriesModalProps = {
  open: boolean;
  onClose: () => void;
  categories: string[];
  onChanged: (categories: string[]) => void;
};

export function ManageCategoriesModal({
  open,
  onClose,
  categories,
  onChanged,
}: ManageCategoriesModalProps) {
  const [list, setList] = useState(categories);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (open) {
      setList(categories);
      setError(null);
      setNewName("");
      setRenaming(null);
    }
  }, [open, categories]);

  const run = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    const envelope = await safeFetch<{ categories: string[] }>("/api/contacts/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!envelope.success) {
      setError(envelope.error);
      return false;
    }
    setList(envelope.data.categories);
    onChanged(envelope.data.categories);
    return true;
  };

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    const ok = await run({ action: "add", name });
    if (ok) setNewName("");
  };

  const remove = async (name: string) => {
    if (!confirm(`Remove “${name}”? Contacts in this category will be uncategorized.`)) return;
    await run({ action: "remove", name });
  };

  const rename = async () => {
    if (!renaming) return;
    const to = renameValue.trim();
    if (!to) return;
    const ok = await run({ action: "rename", from: renaming, to });
    if (ok) {
      setRenaming(null);
      setRenameValue("");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage categories"
      description="Create your own groups (Investors, Luxury, Past referrals…). Assign them to contacts and filter with one click."
      icon="category"
      size="md"
      footer={<ModalFooterActions onCancel={onClose} primaryLabel="Done" onPrimary={onClose} />}
    >
      <div className="space-y-4">
        {error ? (
          <p className="rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-[13px] text-error">
            {error}
          </p>
        ) : null}

        <ul className="space-y-2">
          {list.map((name) => (
            <li
              key={name}
              className="flex items-center justify-between gap-2 rounded-xl border border-outline-variant/15 bg-cream/50 px-3 py-2"
            >
              {renaming === name ? (
                <input
                  className={modalInputClass}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                />
              ) : (
                <span className="text-[14px] font-medium text-ink">{name}</span>
              )}
              <div className="flex shrink-0 gap-1">
                {renaming === name ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void rename()}
                      className="rounded-full bg-sage px-3 py-1 text-[12px] text-ivory"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenaming(null);
                        setRenameValue("");
                      }}
                      className="rounded-full px-3 py-1 text-[12px] text-taupe"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setRenaming(name);
                        setRenameValue(name);
                      }}
                      className="rounded-full px-2 py-1 text-[12px] text-rose-gold-deep hover:bg-champagne"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(name)}
                      className="rounded-full px-2 py-1 text-[12px] text-error hover:bg-error/5"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <ModalField label="New category">
            <input
              className={modalInputClass}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Investors"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void add();
                }
              }}
            />
          </ModalField>
          <button
            type="button"
            disabled={busy || !newName.trim()}
            onClick={() => void add()}
            className="inline-flex items-center gap-1 rounded-full bg-rose-gold px-4 py-2.5 text-[13px] font-medium text-ivory disabled:opacity-50"
          >
            <Icon name="add" className="text-[18px]" />
            Add
          </button>
        </div>
      </div>
    </Modal>
  );
}
