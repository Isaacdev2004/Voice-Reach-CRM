"use client";
import { useEffect, useState } from "react";
export function AiEconomics() {
  const [data, setData] = useState<Record<string, unknown> | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/admin/ai")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (active) setData(d);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Administrative reporting is unavailable",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="assistant-command-center">
      <h1 className="font-serif text-4xl">AI economics</h1>
      <p>
        Restricted administrative view. Verified cohort data and explicit
        reporting gaps.
      </p>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <div className="ai-comparison-grid">
            {[
              ["AI Plus subscribers", data.aiPlusSubscribers],

              ["Recognized AI revenue", data.recognizedAiRevenue],
              ["Provider-billed direct costs", data.directProviderBilledCosts],
              ["Contribution margin", data.contributionMargin],
              ["Trial conversion", data.trialConversion],
            ].map(([label, value]) => (
              <article className="reviews-referrals" key={String(label)}>
                <h2>{String(label)}</h2>
                <p>{value == null ? "Unavailable" : String(value)}</p>
              </article>
            ))}
          </div>
          <p>{String(data.scope)}</p>
          <details>
            <summary>Authorized cohort usage and cost coverage</summary>
            <pre>{JSON.stringify(data.accounts, null, 2)}</pre>
          </details>
          <p>
            Unknown financial data is excluded from profitability claims. Cost
            alerts do not change subscriber entitlements.
          </p>
        </>
      )}
    </section>
  );
}
