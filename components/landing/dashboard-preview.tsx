/** CSS-only ARI dashboard preview for the landing hero — no stock photography. */
export function DashboardPreview() {
  const leads = [
    { name: "Sarah M.", stage: "Hot", action: "Call today", hot: true },
    { name: "James & Lisa K.", stage: "Tour set", action: "Send follow-up", hot: false },
    { name: "David R.", stage: "New lead", action: "Intro email", hot: false },
  ];

  return (
    <div
      className="overflow-hidden rounded-t-2xl border border-outline-variant/20 bg-ivory shadow-[0_-8px_40px_rgba(26,20,16,0.12)] md:rounded-2xl md:shadow-card"
      aria-hidden
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-outline-variant/15 bg-champagne/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-gold/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-taupe/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-sage/40" />
        <span className="ml-3 text-[11px] font-medium text-taupe">app.myari.io/dashboard</span>
      </div>

      <div className="flex min-h-[220px] sm:min-h-[260px] md:min-h-[300px]">
        {/* Sidebar hint */}
        <div className="hidden w-14 shrink-0 border-r border-outline-variant/10 bg-cream/80 py-4 sm:block md:w-16">
          <div className="mx-auto mb-4 h-8 w-8 rounded-lg bg-rose-gold/20" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="mx-auto mb-2 h-7 w-7 rounded-md bg-outline-variant/10" />
          ))}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-taupe">
                Today&apos;s priority
              </p>
              <p className="font-serif text-[15px] font-semibold text-ink sm:text-[18px]">
                3 leads need follow-up
              </p>
            </div>
            <span className="rounded-full bg-sage-light px-2.5 py-1 text-[10px] font-semibold text-emerald-muted">
              Auto follow-up on
            </span>
          </div>

          <div className="grid flex-1 grid-cols-3 gap-2">
            {[
              { label: "New leads", value: "12" },
              { label: "Replied", value: "5" },
              { label: "Due today", value: "3" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-outline-variant/10 bg-cream/60 px-2 py-2 sm:px-3 sm:py-2.5"
              >
                <p className="text-[9px] font-medium uppercase tracking-wide text-taupe sm:text-[10px]">
                  {stat.label}
                </p>
                <p className="font-serif text-[18px] font-semibold text-ink sm:text-[22px]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 rounded-xl border border-outline-variant/10 bg-cream/40 p-2 sm:p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-taupe">
              Who to contact next
            </p>
            {leads.map((lead) => (
              <div
                key={lead.name}
                className="flex items-center justify-between gap-2 rounded-lg bg-ivory px-2 py-1.5 sm:px-3 sm:py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-ink sm:text-[13px]">
                    {lead.name}
                  </p>
                  <p className="text-[10px] text-taupe">{lead.stage}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold sm:text-[10px] ${
                    lead.hot
                      ? "bg-rose-gold/15 text-rose-gold-deep"
                      : "bg-sage-light text-emerald-muted"
                  }`}
                >
                  {lead.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
