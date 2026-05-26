import { TriggerRulesPanel } from "@/components/automations/trigger-rules-panel";
import { Icon } from "@/components/ui/icon";
import Link from "next/link";

export default function AutomationRulesPage() {
  return (
    <div className="luxury-page p-8 max-w-[1100px] w-full mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/automations"
          className="inline-flex w-fit items-center gap-1 text-[13px] text-taupe transition-colors hover:text-rose-gold-deep"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Workflows canvas
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-taupe">
            Automation engine
          </p>
          <h1 className="mt-1 font-serif text-[34px] font-semibold text-ink">
            Trigger rules
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-slate-text">
            Lightweight automations that fire the moment something happens — a voicemail is
            listened to, a contact replies, an email is opened. They run alongside your visual
            workflows.
          </p>
        </div>
      </div>

      <TriggerRulesPanel />
    </div>
  );
}
