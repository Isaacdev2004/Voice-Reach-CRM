"use client";

import type { ReactNode } from "react";

const inputClassName =
  "h-[56px] w-full rounded-full border border-outline-variant bg-white px-sm font-body-md text-body-md text-ink outline-none transition-all placeholder:text-outline focus:border-secondary focus:ring-2 focus:ring-secondary/20";

type AuthFieldProps = {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  labelExtra?: ReactNode;
};

export function AuthField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  autoComplete,
  required = true,
  labelExtra,
}: AuthFieldProps) {
  return (
    <div className="space-y-xs">
      <div className="flex items-center justify-between">
        <label className="font-label-md text-label-md text-on-surface" htmlFor={id}>
          {label}
        </label>
        {labelExtra}
      </div>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className={inputClassName}
      />
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="rounded-xl bg-error-container px-sm py-xs font-body-md text-body-md text-on-error-container" role="alert">
      {message}
    </p>
  );
}

export function AuthSubmitButton({
  children,
  loading,
  loadingLabel,
}: {
  children: ReactNode;
  loading: boolean;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-sm h-[56px] w-full rounded-full bg-primary font-label-md text-label-md font-bold text-white shadow-md transition-all hover:bg-secondary active:scale-[0.98] disabled:opacity-60"
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
