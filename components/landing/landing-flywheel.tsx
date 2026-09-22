import { AriLogo } from "@/components/brand/ari-logo";
import { Icon } from "@/components/ui/icon";
import { BRAND_NAME } from "@/lib/brand";

const STEPS = [
  {
    icon: "group_add",
    title: "Capture Leads",
    body: "All your leads in one place.",
    angle: -90,
  },
  {
    icon: "bolt",
    title: "Auto Follow-Up",
    body: "Instant, personalized outreach.",
    angle: -30,
  },
  {
    icon: "favorite",
    title: "Nurture",
    body: "Keep them engaged over time.",
    angle: 30,
  },
  {
    icon: "notifications_active",
    title: "Reminders & Tasks",
    body: "Never let a lead slip.",
    angle: 90,
  },
  {
    icon: "replay",
    title: "Re-Engage",
    body: "Automatically reach out again.",
    angle: 150,
  },
  {
    icon: "handshake",
    title: "Close More Deals",
    body: "Turn conversations into clients.",
    angle: 210,
  },
];

const RADIUS = 168;

function FlywheelNode({
  icon,
  title,
  body,
  angle,
}: {
  icon: string;
  title: string;
  body: string;
  angle: number;
}) {
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * RADIUS;
  const y = Math.sin(rad) * RADIUS;

  return (
    <div
      className="absolute left-1/2 top-1/2 w-[9.5rem] -translate-x-1/2 -translate-y-1/2 text-center"
      style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-rose-gold/25 bg-ivory shadow-sm">
        <Icon name={icon} className="text-[22px] text-rose-gold-deep" />
      </div>
      <p className="mt-2 font-serif text-[14px] font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-slate-text">{body}</p>
    </div>
  );
}

export function LandingFlywheel() {
  return (
    <section id="features" className="relative overflow-hidden bg-cream py-16 md:py-20 lg:py-24">
      <p
        className="pointer-events-none absolute left-[4%] top-[42%] hidden font-[family-name:var(--font-hand)] text-[2rem] text-rose-gold/35 md:block lg:text-[2.75rem]"
        aria-hidden
      >
        More Conversations.
      </p>
      <p
        className="pointer-events-none absolute right-[4%] top-[42%] hidden font-[family-name:var(--font-hand)] text-[2rem] text-rose-gold/35 md:block lg:text-[2.75rem]"
        aria-hidden
      >
        More Closings.
      </p>

      <div className="landing-shell">
        <div className="mx-auto max-w-[44rem] text-center">
          <h2 className="font-serif text-[28px] font-semibold text-ink md:text-[36px] lg:text-[40px]">
            Lead follow-up on autopilot — so you close more deals
          </h2>
          <p className="mt-4 text-[16px] text-slate-text lg:text-[17px]">
            A simple, automated cycle that turns more leads into clients.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 md:hidden">
          {STEPS.map((step) => (
            <article
              key={step.title}
              className="flex items-start gap-3 rounded-2xl border border-outline-variant/10 bg-ivory p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rose-gold/20 bg-cream">
                <Icon name={step.icon} className="text-[20px] text-rose-gold-deep" />
              </div>
              <div>
                <p className="font-serif text-[15px] font-semibold text-ink">{step.title}</p>
                <p className="mt-0.5 text-[13px] text-slate-text">{step.body}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="relative mx-auto mt-12 hidden h-[30rem] max-w-[44rem] md:mt-14 md:block lg:h-[32rem]">
          <svg
            className="absolute inset-0 h-full w-full text-rose-gold/25"
            viewBox="0 0 400 400"
            aria-hidden
          >
            <circle
              cx="200"
              cy="200"
              r="155"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="6 8"
            />
          </svg>

          <div className="absolute left-1/2 top-1/2 flex h-[9.5rem] w-[9.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-rose-gold/20 bg-ivory shadow-card">
            <AriLogo height={36} />
            <p className="mt-2 px-3 text-center text-[9px] font-bold uppercase leading-tight tracking-[0.14em] text-rose-gold-deep">
              Turn leads into closed deals
            </p>
          </div>

          {STEPS.map((step) => (
            <FlywheelNode key={step.title} {...step} />
          ))}
        </div>
      </div>
    </section>
  );
}
