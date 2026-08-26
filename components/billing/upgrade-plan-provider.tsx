"use client";

import { UpgradePlanModal } from "@/components/settings/upgrade-plan-modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { planById, type PlanId } from "@/lib/billing/plans";
import {
  clearPendingPlan,
  readPendingPlan,
  rememberPendingPlan,
} from "@/lib/billing/pending-plan";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { fetchSettings, saveSettingsLocal } from "@/lib/settings/storage";
import type { BillingSettings, UserSettings } from "@/lib/settings/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type UpgradePlanContextValue = {
  openUpgrade: () => void;
  startCheckout: (planId: PlanId) => Promise<void>;
  currentPlanId: string;
  billing: BillingSettings;
  lastUpgradedAt: number;
  subscriptionActive: boolean;
};

const UpgradePlanContext = createContext<UpgradePlanContextValue | null>(null);

export function useUpgradePlan() {
  const ctx = useContext(UpgradePlanContext);
  if (!ctx) {
    throw new Error("useUpgradePlan must be used within UpgradePlanProvider");
  }
  return ctx;
}

export function UpgradePlanProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null,
  );
  const [lastUpgradedAt, setLastUpgradedAt] = useState(0);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const checkoutStarted = useRef(false);

  const billing = settings?.billing ?? DEFAULT_SETTINGS.billing;
  // Explicit "none" = unpaid. Missing status on older accounts = grandfathered (already using the app).
  const subscriptionActive =
    billing.subscriptionStatus === "active" ||
    (billing.subscriptionStatus == null && billing.monthlyPrice > 0);

  const loadSettings = useCallback(async () => {
    try {
      const data = await fetchSettings();
      setSettings(data.settings);
      saveSettingsLocal(data.settings);
      return data.settings;
    } catch {
      const local = DEFAULT_SETTINGS;
      setSettings(local);
      return local;
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const startCheckout = useCallback(async (planId: PlanId) => {
    setSaving(true);
    setToast(null);
    setCheckoutError(null);
    rememberPendingPlan(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ??
            "Could not start Stripe checkout. Check Stripe keys in Vercel.",
        );
      }
      const url = (data as { url?: string }).url;
      if (url) {
        // Keep pending plan until webhook confirms payment; Stripe redirect is next.
        window.location.assign(url);
        return;
      }
      throw new Error("Stripe checkout URL missing");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Checkout failed";
      setCheckoutError(message);
      setToast({ message, tone: "error" });
      window.setTimeout(() => setToast(null), 8000);
      checkoutStarted.current = false;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("upgrade") !== "1") return;
    setOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("upgrade");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      clearPendingPlan();
      void loadSettings().then((s) => {
        setLastUpgradedAt(Date.now());
        setToast({
          message:
            s.billing.subscriptionStatus === "active"
              ? `Payment received — you're on ${s.billing.planName}.`
              : "Payment received. Activating your plan…",
          tone: "success",
        });
        window.setTimeout(() => setToast(null), 5000);
      });
      const next = new URLSearchParams(searchParams.toString());
      next.delete("checkout");
      next.delete("plan");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
    if (checkout === "cancel") {
      setToast({
        message: "Checkout canceled — pick a plan to unlock full access.",
        tone: "error",
      });
      setOpen(true);
      window.setTimeout(() => setToast(null), 5000);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("checkout");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [searchParams, pathname, router, loadSettings]);

  // After sign-up: URL ?plan= OR localStorage pending plan → Stripe Checkout
  useEffect(() => {
    if (checkoutStarted.current || saving) return;
    if (subscriptionActive) {
      clearPendingPlan();
      return;
    }

    const fromUrl = searchParams.get("plan");
    const pending = fromUrl && planById(fromUrl) ? (fromUrl as PlanId) : readPendingPlan();
    if (!pending) return;

    checkoutStarted.current = true;
    void startCheckout(pending);
  }, [searchParams, startCheckout, subscriptionActive, saving]);

  // Unpaid accounts: open plan picker (unless checkout already running)
  useEffect(() => {
    if (!settings) return;
    if (subscriptionActive) return;
    if (saving) return;
    if (readPendingPlan()) return;
    setOpen(true);
  }, [settings, subscriptionActive, saving]);

  const openUpgrade = useCallback(() => {
    void loadSettings();
    setOpen(true);
  }, [loadSettings]);

  return (
    <UpgradePlanContext.Provider
      value={{
        openUpgrade,
        startCheckout,
        currentPlanId: billing.planId,
        billing,
        lastUpgradedAt,
        subscriptionActive,
      }}
    >
      {children}

      <UpgradePlanModal
        open={open}
        onClose={() => {
          // Don't dismiss paywall until they've paid
          if (!subscriptionActive) return;
          if (!saving) setOpen(false);
        }}
        currentPlanId={billing.planId}
        onSelect={() => undefined}
        onCheckout={(planId) => void startCheckout(planId as PlanId)}
        checkoutLoading={saving}
      />

      {!subscriptionActive && !saving ? (
        <div className="fixed inset-0 z-[185] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-outline-variant/20 bg-ivory p-6 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
              Complete payment
            </p>
            <h2 className="mt-2 font-serif text-[26px] font-semibold text-ink">
              Choose a plan to continue
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-text">
              Your account is ready. Stripe checkout unlocks contacts, campaigns, and ringless
              voicemail for the tier you pick — nothing is active until payment completes.
            </p>
            {checkoutError ? (
              <p className="mt-3 rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-[13px] text-error">
                {checkoutError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-5 w-full rounded-full bg-rose-gold px-5 py-3 text-[14px] font-medium text-ivory"
            >
              View plans &amp; pay
            </button>
          </div>
        </div>
      ) : null}

      {saving ? (
        <div
          className="fixed inset-0 z-[190] flex items-center justify-center bg-ink/20 backdrop-blur-[2px]"
          aria-busy="true"
        >
          <div className="flex items-center gap-3 rounded-xl bg-ivory px-6 py-4 shadow-card">
            <Icon name="progress_activity" className="animate-spin text-rose-gold-deep" />
            <span className="text-[14px] text-ink">Redirecting to secure Stripe checkout…</span>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[200] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 shadow-card",
            toast.tone === "success" ? "border-emerald-muted/30 bg-ivory" : "border-error/30",
          )}
          role="status"
        >
          <Icon
            name={toast.tone === "success" ? "check_circle" : "error"}
            className={toast.tone === "success" ? "text-emerald-muted" : "text-error"}
          />
          <span className="text-[14px] text-ink">{toast.message}</span>
        </div>
      ) : null}
    </UpgradePlanContext.Provider>
  );
}
