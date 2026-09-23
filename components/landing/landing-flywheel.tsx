import { AriLogo } from "@/components/brand/ari-logo";
import { Icon } from "@/components/ui/icon";

const STEPS = [
  { icon: "group_add", title: "Capture Leads", body: "All your leads in one place." },
  { icon: "bolt", title: "Auto Follow-Up", body: "Instant, personalized outreach." },
  { icon: "favorite", title: "Nurture", body: "Keep them engaged over time." },
  { icon: "notifications_active", title: "Reminders & Tasks", body: "Never let a lead slip." },
  { icon: "replay", title: "Re-Engage", body: "Automatically reach out again." },
  { icon: "trending_up", title: "Close More Deals", body: "Turn conversations into clients." },
] as const;

const SIZE = 720;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RING_R = 228;
const HUB_R = 96;
/** Positions around the ring (counter-clockwise from top). */
const RING_ANGLES = [-90, -150, 150, 90, 30, -30] as const;

/** Map business step order onto ring so arrows read clockwise on a clock face. */
function stepAngle(index: number) {
  const position = (STEPS.length - index) % STEPS.length;
  return RING_ANGLES[position];
}

function polar(r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function midAngle(from: number, to: number) {
  const span = (to - from + 360) % 360;
  return from + span / 2;
}

/** Unit tangent pointing clockwise along the ring (increasing angle). */
function clockwiseTangent(deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: -Math.sin(rad), y: Math.cos(rad) };
}

function FlywheelDiagram() {
  return (
    <div className="relative mx-auto w-full max-w-[44rem] lg:max-w-[50rem] xl:max-w-[56rem]">
      <p
        className="pointer-events-none absolute -left-2 top-[38%] z-10 hidden font-[family-name:var(--font-hand)] text-[1.75rem] text-rose-gold/40 lg:block xl:-left-6 xl:text-[2.5rem]"
        aria-hidden
      >
        More Conversations.
      </p>
      <p
        className="pointer-events-none absolute -right-2 top-[38%] z-10 hidden font-[family-name:var(--font-hand)] text-[1.75rem] text-rose-gold/40 lg:block xl:-right-6 xl:text-[2.5rem]"
        aria-hidden
      >
        More Closings.
      </p>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full"
        role="img"
        aria-label="Automated lead follow-up cycle: capture, follow up, nurture, reminders, re-engage, close"
      >
        {/* Outer soft glow */}
        <circle cx={CX} cy={CY} r={RING_R + 22} fill="#faf7f2" opacity="0.6" />

        {/* Dashed orbit ring */}
        <circle
          cx={CX}
          cy={CY}
          r={RING_R}
          fill="none"
          stroke="#c4a484"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeDasharray="7 9"
        />

        {/* Clockwise flow arrows between steps */}
        {STEPS.map((_, i) => {
          const angle = stepAngle(i);
          const next = stepAngle((i + 1) % STEPS.length);
          const mid = midAngle(angle, next);
          const tan = clockwiseTangent(mid);
          const tail = polar(RING_R - 10, mid);
          const tip = {
            x: tail.x + tan.x * 24,
            y: tail.y + tan.y * 24,
          };
          const head = 8;
          const wing = 4.5;
          return (
            <g key={`arrow-${i}`}>
              <line
                x1={tail.x}
                y1={tail.y}
                x2={tip.x}
                y2={tip.y}
                stroke="#c4a484"
                strokeOpacity="0.75"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <polygon
                points={`${tip.x},${tip.y} ${tip.x - tan.x * head + tan.y * wing},${tip.y - tan.y * head - tan.x * wing} ${tip.x - tan.x * head - tan.y * wing},${tip.y - tan.y * head + tan.x * wing}`}
                fill="#c4a484"
                fillOpacity="0.9"
              />
            </g>
          );
        })}

        {/* Center hub */}
        <circle cx={CX} cy={CY} r={HUB_R + 12} fill="#fffef9" stroke="#e8dfd0" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={HUB_R} fill="#fffef9" stroke="#c4a484" strokeOpacity="0.35" strokeWidth="1.5" />

        <foreignObject x={CX - 92} y={CY - 68} width="184" height="136">
          <div className="flex h-full flex-col items-center justify-center text-center">
            <AriLogo height={52} />
            <p className="mt-2 text-[11px] font-bold uppercase leading-tight tracking-[0.14em] text-rose-gold-deep">
              Turn leads into closed deals
            </p>
          </div>
        </foreignObject>

        {/* Step nodes */}
        {STEPS.map((step, i) => {
          const { x, y } = polar(RING_R, stepAngle(i));
          const w = 182;
          const h = 136;
          return (
            <foreignObject
              key={step.title}
              x={x - w / 2}
              y={y - h / 2}
              width={w}
              height={h}
            >
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-outline-variant/15 bg-ivory px-3 py-3 text-center shadow-[0_8px_24px_rgba(26,20,16,0.06)]">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-rose-gold/20 bg-cream">
                  <Icon name={step.icon} className="text-[28px] text-rose-gold-deep" />
                </div>
                <p className="mt-2 font-serif text-[16px] font-semibold leading-tight text-ink">
                  {step.title}
                </p>
                <p className="mt-1 text-[14px] leading-snug text-slate-text">{step.body}</p>
              </div>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}

function FlywheelMobile() {
  return (
    <ol className="relative mx-auto max-w-md space-y-0 md:hidden">
      {STEPS.map((step, i) => (
        <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
          {i < STEPS.length - 1 ? (
            <span
              className="absolute left-[22px] top-12 h-[calc(100%-2rem)] w-px bg-rose-gold/30"
              aria-hidden
            />
          ) : null}
          <div className="relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rose-gold/25 bg-ivory shadow-sm">
            <Icon name={step.icon} className="text-[22px] text-rose-gold-deep" />
          </div>
          <div className="pt-1">
            <p className="font-serif text-[18px] font-semibold text-ink">{step.title}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-text">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function LandingFlywheel() {
  return (
    <section id="features" className="relative overflow-hidden bg-cream py-10 md:py-12 lg:py-14">
      <div className="landing-shell">
        <div className="mx-auto max-w-[44rem] text-center">
          <h2 className="font-serif text-[32px] font-semibold text-ink md:text-[40px] lg:text-[44px]">
            Lead follow-up on autopilot — so you close more deals
          </h2>
          <p className="mt-3 text-[17px] text-slate-text lg:text-[18px]">
            A simple, automated cycle that turns more leads into clients.
          </p>
        </div>

        <div className="mt-6 md:mt-8">
          <FlywheelMobile />
          <div className="hidden md:block">
            <FlywheelDiagram />
          </div>
        </div>
      </div>
    </section>
  );
}
