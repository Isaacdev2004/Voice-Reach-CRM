"use client";

import { Modal, ModalFooterActions } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { PLAN_OPTIONS } from "@/lib/billing/plans";
import type { BillingSettings } from "@/lib/settings/types";

type UpgradePlanModalProps = {
  open: boolean;
  onClose: () => void;
  currentPlanId: string;
  onSelect: (plan: BillingSettings) => void;
  onCheckout?: (planId: string) => void;
  checkoutLoading?: boolean;
};

export function UpgradePlanModal({
  open,
  onClose,
  currentPlanId,
  onSelect,
  onCheckout,
  checkoutLoading,
}: UpgradePlanModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose your plan"
      description="Secure Stripe checkout. Your plan unlocks only after payment completes — nothing is free after sign-up."
      icon="workspace_premium"
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          cancelLabel={checkoutLoading ? "Please wait…" : "Close"}
          primaryLabel="Close"
          onPrimary={onClose}
          primaryDisabled={checkoutLoading}
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {PLAN_OPTIONS.map((plan) => {
          const selected = plan.id === currentPlanId;
          return (
            <button
              key={plan.id}
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
                "rounded-2xl border p-5 text-left transition-all hover:shadow-card",
                selected
                  ? "border-rose-gold-deep bg-rose-gold/10"
                  : "border-outline-variant/20 bg-ivory hover:border-rose-gold/40",
              )}
            >
              <p className="font-serif text-[20px] font-semibold text-ink">{plan.name}</p>
              <p className="mt-1 font-serif text-[28px] text-ink">
                ${plan.price}
                <span className="text-[14px] font-normal text-taupe">/mo</span>
              </p>
              <p className="mt-2 text-[13px] text-taupe">
                {plan.contactLimit
                  ? `Up to ${plan.contactLimit.toLocaleString()} contacts`
                  : "Unlimited contacts"}
                {plan.smsIncluded
                  ? ` · ${plan.smsIncluded.toLocaleString()} SMS/mo`
                  : " · SMS pay as you go"}
                {plan.rvmIncluded
                  ? ` · ${plan.rvmIncluded.toLocaleString()} RVM/mo`
                  : " · RVM pay as you go"}
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[12px] text-slate-text">
                    <Icon name="check" className="text-[16px] text-emerald-muted" />
                    {f}
                  </li>
                ))}
              </ul>
              {selected ? (
                <span className="mt-4 inline-block text-[12px] font-semibold uppercase text-rose-gold-deep">
                  Current plan
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
