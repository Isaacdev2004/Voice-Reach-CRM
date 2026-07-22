"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ModalSize = "sm" | "md" | "lg";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  icon?: string;
  size?: ModalSize;
  className?: string;
};

/** Explicit pixel max-widths — avoids flex min-content collapse with w-full + max-w-* */
const sizeWidth: Record<ModalSize, string> = {
  sm: "max-w-[28rem]",
  md: "max-w-[32rem]",
  lg: "max-w-[36rem]",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  icon,
  size = "md",
  className,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 10000 }} role="presentation">
      <button
        type="button"
        className="modal-overlay fixed inset-0 bg-ink/55 backdrop-blur-[6px]"
        onClick={onClose}
        aria-label="Close dialog"
      />

      {/* min-h-full + grid centers dialog without flex width collapse */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal
          aria-labelledby="modal-title"
          className={cn(
            "modal-panel relative z-10 flex w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] border border-outline-variant/20 bg-ivory shadow-[0_24px_80px_-12px_rgba(26,22,18,0.35)] sm:w-[calc(100vw-3rem)]",
            sizeWidth[size],
            className,
          )}
          style={{ maxHeight: "min(640px, calc(100vh - 2rem))" }}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="shrink-0 border-b border-outline-variant/10 bg-gradient-to-b from-champagne/50 to-ivory px-6 pb-5 pt-6 sm:px-8">
            <div className="flex items-start gap-4">
              {icon ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-gold/15 text-rose-gold-deep">
                  <Icon name={icon} className="text-[24px]" />
                </div>
              ) : null}
              <div className="min-w-0 flex-1 pr-2">
                <h2
                  id="modal-title"
                  className="font-serif text-[26px] font-semibold leading-tight text-ink"
                >
                  {title}
                </h2>
                {description ? (
                  <p className="mt-1.5 text-[14px] leading-relaxed text-slate-text">{description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border border-outline-variant/20 bg-ivory p-2.5 text-taupe shadow-sm transition-colors hover:border-rose-gold/30 hover:bg-champagne hover:text-ink"
                aria-label="Close"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
          </header>

          <div className="overflow-y-auto px-6 py-6 sm:px-8">{children}</div>

          {footer ? (
            <footer className="shrink-0 border-t border-outline-variant/10 bg-cream/40 px-6 py-4 sm:px-8">
              {footer}
            </footer>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export const modalInputClass =
  "box-border h-11 w-full min-w-0 rounded-xl border border-outline-variant/35 bg-ivory px-4 text-[15px] text-ink shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-taupe/60 focus:border-rose-gold/50 focus:ring-2 focus:ring-rose-gold/15";

export const modalLabelClass = "mb-2 block text-[13px] font-medium text-taupe";

export function ModalField({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("block min-w-0", className)}>
      <label className={modalLabelClass}>
        {label}
        {required ? <span className="text-rose-gold-deep"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

export function ModalFooterActions({
  onCancel,
  cancelLabel = "Cancel",
  primaryLabel,
  onPrimary,
  primaryType = "button",
  primaryDisabled,
  primaryLoading,
  formId,
}: {
  onCancel: () => void;
  cancelLabel?: string;
  primaryLabel: string;
  onPrimary?: () => void;
  primaryType?: "button" | "submit";
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  formId?: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="h-11 shrink-0 rounded-xl border border-outline-variant/35 bg-ivory px-6 text-[14px] font-medium text-taupe transition-colors hover:bg-champagne sm:min-w-[120px]"
      >
        {cancelLabel}
      </button>
      <button
        type={primaryType}
        form={formId}
        onClick={onPrimary}
        disabled={primaryDisabled || primaryLoading}
        className="h-11 shrink-0 rounded-xl bg-rose-gold px-6 text-[14px] font-medium text-ivory shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[140px]"
      >
        {primaryLoading ? "Please wait…" : primaryLabel}
      </button>
    </div>
  );
}
