import { CRM_ALTERNATIVES } from "@/lib/marketing/alternatives";
import { Reveal } from "@/components/marketing/motion-reveal";

export function LandingAlternatives() {
  const { headline, subhead, rows } = CRM_ALTERNATIVES;

  return (
    <section className="scroll-mt-[4.25rem] bg-ivory py-12 md:py-16 lg:py-20">
      <div className="landing-shell">
        <Reveal className="mx-auto max-w-[44rem] text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
            Compare
          </p>
          <h2 className="mt-3 font-serif text-[28px] font-semibold text-ink md:text-[36px] lg:text-[40px]">
            {headline}
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-text lg:text-[17px]">{subhead}</p>
        </Reveal>

        <Reveal className="mt-10 overflow-x-auto rounded-2xl border border-outline-variant/15 bg-cream">
          <table className="w-full min-w-[640px] border-collapse text-left text-[13px] md:text-[14px]">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-champagne/50">
                <th className="px-4 py-3 font-semibold text-ink md:px-6"> </th>
                <th className="px-4 py-3 font-semibold text-taupe md:px-6">Follow Up Boss</th>
                <th className="px-4 py-3 font-semibold text-taupe md:px-6">kvCORE</th>
                <th className="px-4 py-3 font-semibold text-rose-gold-deep md:px-6">MyARI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-outline-variant/10 last:border-0">
                  <th className="px-4 py-3.5 font-semibold text-ink md:px-6">{row.label}</th>
                  <td className="px-4 py-3.5 text-slate-text md:px-6">{row.followUpBoss}</td>
                  <td className="px-4 py-3.5 text-slate-text md:px-6">{row.kvcore}</td>
                  <td className="px-4 py-3.5 font-medium text-ink md:px-6">{row.ari}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  );
}
