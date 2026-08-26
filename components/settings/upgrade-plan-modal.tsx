"use client";

import { Modal } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { PLAN_OPTIONS } from "@/lib/billing/plans";
import type { BillingSettings } from "@/lib/settings/types";

type UpgradePlanModalProps = {
  open: boolean;
  onClose: () => void;
  currentPlanId: string;
  subscriptionActive?: boolean;
  onSelect: (plan: BillingSettings) => void;
  onCheckout?: (planId: string) => void;
  checkoutLoading?: boolean;
};

export function UpgradePlanModal({
  open,
  onClose,
  currentPlanId,
  subscriptionActive = false,
  onSelect,
  onCheckout,
  checkoutLoading,
}: UpgradePlanModalProps) {
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!checkoutLoading) onClose();
      }}
      title="Choose your plan"
      description="Pick a tier, then pay securely with Stripe. Features unlock only after payment succeeds."
      icon="workspace_premium"
      size="xl"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {PLAN_OPTIONS.map((plan) => {
          const isCurrent = subscriptionActive && plan.id === currentPlanId;
          const featured = Boolean(plan.featured) && !isCurrent;
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border p-5 text-left",
                isCurrent
                  ? "border-emerald-muted/40 bg-sage-light/30"
                  : featured
                    ? "border-rose-gold-deep bg-rose-gold/5"
                    : "border-outline-variant/20 bg-ivory",
              )}
            >
              {featured ? (
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-gold-deep">
                  Most popular
                </p>
              ) : null}
              <p className="font-serif text-[22px] font-semibold text-ink">{plan.name}</p>
              <p className="mt-1 font-serif text-[30px] text-ink">
                ${plan.price}
                <span className="text-[14px] font-normal text-taupe">/mo</span>
              </p>
              <p className="mt-2 text-[13px] leading-snug text-taupe">{plan.description}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12px] text-slate-text">
                    <Icon name="check" className="mt-0.5 shrink-0 text-[16px] text-emerald-muted" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <p className="mt-5 rounded-full border border-emerald-muted/30 bg-ivory py-2.5 text-center text-[12px] font-semibold uppercase tracking-wide text-emerald-muted">
                  Your current plan
                </p>
              ) : (
                <button
                  type="button"
                  disabled={checkoutLoading}
                  onClick={() => {
                    if (onCheckout) {
                      onCheckout(plan.id);
                      return;
                    }
                    onSelect({
                      planId: plan.id,
                      planName: plan.name,
                      monthlyPrice: plan.price,
                      voiceMinutesLimit: plan.rvmIncluded || plan.smsIncluded || 0,
                      voiceMinutesUsed: 0,
                    });
                  }}
                  className={cn(
                    "mt-5 w-full rounded-full py-3 text-[13px] font-semibold text-ivory transition-opacity disabled:opacity-50",
                    featured ? "bg-rose-gold" : "bg-ink",
                  )}
                >
                  {checkoutLoading ? "Opening Stripe…" : `Pay $${plan.price}/mo`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-center text-[12px] text-taupe">
        Use the × to dismiss. Manage or cancel anytime in Settings → Billing.
      </p>
    </Modal>
  );
}
