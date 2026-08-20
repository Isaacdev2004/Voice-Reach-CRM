"use client";

import { UpgradePlanModal } from "@/components/settings/upgrade-plan-modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { planById, type PlanId } from "@/lib/billing/plans";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { fetchSettings, persistSettings, saveSettingsLocal } from "@/lib/settings/storage";
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
  const checkoutStarted = useRef(false);

  const billing = settings?.billing ?? DEFAULT_SETTINGS.billing;

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

  const startCheckout = useCallback(
    async (planId: PlanId) => {
      setSaving(true);
      setToast(null);
      try {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Could not start checkout");
        }
        if (data.url) {
          window.location.assign(data.url);
          return;
        }
        throw new Error("Stripe checkout URL missing");
      } catch (e) {
        setToast({
          message: e instanceof Error ? e.message : "Checkout failed",
          tone: "error",
        });
        window.setTimeout(() => setToast(null), 5000);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

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
      void loadSettings().then((s) => {
        setLastUpgradedAt(Date.now());
        setToast({
          message: `Payment received — you're on ${s.billing.planName}.`,
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
  }, [searchParams, pathname, router, loadSettings]);

  useEffect(() => {
    const planParam = searchParams.get("plan");
    if (!planParam || checkoutStarted.current) return;
    const plan = planById(planParam);
    if (!plan) return;
    checkoutStarted.current = true;
    void startCheckout(plan.id);
  }, [searchParams, startCheckout]);

  const openUpgrade = useCallback(() => {
    void loadSettings();
    setOpen(true);
  }, [loadSettings]);

  const handleSelect = async (selected: BillingSettings) => {
    const base = settings ?? (await loadSettings());
    setSaving(true);
    const nextSettings: UserSettings = {
      ...base,
      billing: {
        ...selected,
        voiceMinutesUsed: base.billing.voiceMinutesUsed,
      },
      updatedAt: new Date().toISOString(),
    };

    try {
      const data = await persistSettings(nextSettings);
      setSettings(data.settings);
      saveSettingsLocal(data.settings);
      setLastUpgradedAt(Date.now());
      setToast({
        message: `You're now on ${data.settings.billing.planName}`,
        tone: "success",
      });
    } catch (e) {
      setSettings(nextSettings);
      saveSettingsLocal(nextSettings);
      setLastUpgradedAt(Date.now());
      setToast({
        message:
          e instanceof Error
            ? `${e.message} — plan saved on this device`
            : `Plan updated to ${selected.planName}`,
        tone: "error",
      });
    } finally {
      setSaving(false);
      setOpen(false);
      window.setTimeout(() => setToast(null), 4500);
    }
  };

  return (
    <UpgradePlanContext.Provider
      value={{
        openUpgrade,
        startCheckout,
        currentPlanId: billing.planId,
        billing,
        lastUpgradedAt,
      }}
    >
      {children}

      <UpgradePlanModal
        open={open}
        onClose={() => !saving && setOpen(false)}
        currentPlanId={billing.planId}
        onSelect={(plan) => void handleSelect(plan)}
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
            <span className="text-[14px] text-ink">Redirecting to secure checkout…</span>
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
