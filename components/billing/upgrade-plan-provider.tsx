"use client";

import { UpgradePlanModal } from "@/components/settings/upgrade-plan-modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { type PlanId } from "@/lib/billing/plans";
import { activatePendingTrialIfNeeded } from "@/lib/billing/activate-trial-client";
import {
  clearPendingPlan,
  readPendingPlan,
  rememberPendingPlan,
} from "@/lib/billing/pending-plan";
import { handleTrialClaimSuccess } from "@/lib/marketing/trial-tracking";
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
  const claimAttempted = useRef(false);
  const trialActivateAttempted = useRef(false);

  const billing = settings?.billing ?? DEFAULT_SETTINGS.billing;
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

  // Cardless trial after sign-up (if sign-up page did not finish activation)
  useEffect(() => {
    if (trialActivateAttempted.current) return;
    if (!readPendingPlan()) return;
    if (billing.subscriptionStatus === "trialing" || billing.subscriptionStatus === "active") {
      clearPendingPlan();
      return;
    }
    trialActivateAttempted.current = true;
    void (async () => {
      const ok = await activatePendingTrialIfNeeded();
      if (ok) {
        const s = await loadSettings();
        setLastUpgradedAt(Date.now());
        setToast({
          message: `Your ${s.billing.planName} trial is active — no card required until the trial ends.`,
          tone: "success",
        });
        window.setTimeout(() => setToast(null), 6000);
      } else {
        trialActivateAttempted.current = false;
      }
    })();
  }, [billing.subscriptionStatus, loadSettings]);

  // After pay-then-signup: attach Stripe session to this user once
  useEffect(() => {
    if (claimAttempted.current || typeof window === "undefined") return;
    const sessionId = window.sessionStorage.getItem("ari_checkout_session_id");
    if (!sessionId) return;
    claimAttempted.current = true;

    void (async () => {
      try {
        const res = await fetch("/api/billing/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            planId?: string;
            planPrice?: number;
            trialing?: boolean;
          };
          window.sessionStorage.removeItem("ari_checkout_session_id");
          clearPendingPlan();
          if (data.planId && data.trialing) {
            handleTrialClaimSuccess({
              planId: data.planId,
              planPrice: data.planPrice ?? 0,
              trialing: true,
            });
          }
          const s = await loadSettings();
          setLastUpgradedAt(Date.now());
          setToast({
            message: `You're on ${s.billing.planName}.`,
            tone: "success",
          });
          window.setTimeout(() => setToast(null), 5000);
        }
      } catch {
        /* paywall still shows; user can pay again if needed */
      }
    })();
  }, [loadSettings]);

  const startCheckout = useCallback(async (planId: PlanId) => {
    setSaving(true);
    setToast(null);
    setCheckoutError(null);
    rememberPendingPlan(planId);

    const status = billing.subscriptionStatus ?? "none";

    if (status === "trialing" && planId === (billing.planId as PlanId)) {
      try {
        const res = await fetch("/api/billing/add-payment-method", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (data as { error?: string }).error ?? "Could not open payment setup.",
          );
        }
        const url = (data as { url?: string }).url;
        if (url) window.location.assign(url);
        else throw new Error("Stripe setup URL missing");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Setup failed";
        setCheckoutError(message);
        setToast({ message, tone: "error" });
        window.setTimeout(() => setToast(null), 8000);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (status === "none" || status === "canceled") {
      try {
        const res = await fetch("/api/billing/start-trial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? "Could not start trial.");
        }
        clearPendingPlan();
        if ((data as { trialing?: boolean }).trialing && data.planId) {
          handleTrialClaimSuccess({
            planId: data.planId as string,
            planPrice: (data as { planPrice?: number }).planPrice ?? 0,
            trialing: true,
          });
        }
        await loadSettings();
        setLastUpgradedAt(Date.now());
        setOpen(false);
        setToast({
          message: `Your ${(data as { planName?: string }).planName ?? "plan"} trial is active.`,
          tone: "success",
        });
        window.setTimeout(() => setToast(null), 6000);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Trial start failed";
        setCheckoutError(message);
        setToast({ message, tone: "error" });
        window.setTimeout(() => setToast(null), 8000);
      } finally {
        setSaving(false);
      }
      return;
    }

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
        window.location.assign(url);
        return;
      }
      throw new Error("Stripe checkout URL missing");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Checkout failed";
      clearPendingPlan();
      setCheckoutError(message);
      setToast({ message, tone: "error" });
      window.setTimeout(() => setToast(null), 8000);
    } finally {
      setSaving(false);
    }
  }, [billing.planId, billing.subscriptionStatus, loadSettings]);

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
              ? `Payment received - you're on ${s.billing.planName}.`
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
      clearPendingPlan();
      setToast({
        message: "Checkout canceled - pick a plan to unlock full access.",
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

  // Open upgrade modal only when explicitly triggered (e.g. ?upgrade=1 or via Settings)
  // No forced lockouts so you can freely build, demo, and test accounts without Stripe payment

  const openUpgrade = useCallback(() => {
    void loadSettings();
    setOpen(true);
  }, [loadSettings]);

  return (
    <UpgradePlanContext.Provider
      value={{
        openUpgrade,
        startCheckout,
        currentPlanId: billing.planId || "growth",
        billing,
        lastUpgradedAt,
        subscriptionActive: true,
      }}
    >
      {children}

      <UpgradePlanModal
        open={open}
        onClose={() => {
          if (!saving) setOpen(false);
        }}
        currentPlanId={billing.planId || "growth"}
        subscriptionActive={true}
        onSelect={() => undefined}
        onCheckout={(planId) => void startCheckout(planId as PlanId)}
        checkoutLoading={saving}
      />

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
