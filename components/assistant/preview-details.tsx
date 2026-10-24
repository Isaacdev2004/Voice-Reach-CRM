"use client";
import type { Proposal } from "@/lib/assistant/schema";
const value = (x: unknown) =>
  typeof x === "string" || typeof x === "number" ? String(x) : "";
export function PreviewDetails({ proposal: p }: { proposal: Proposal }) {
  const a = p.action,
    c = p.preview.contact as { name?: string; href?: string } | undefined;
  return (
    <div className="assistant-preview-details">
      {c?.name && (
        <p>
          <strong>Contact:</strong>{" "}
          {c.href ? <a href={c.href}>{c.name}</a> : c.name}
        </p>
      )}
      {["sms", "email"].includes(a.kind) && (
        <>
          <p>
            <strong>From:</strong>{" "}
            {value((p.preview.sender as { from?: string } | undefined)?.from) ||
              "Sender unavailable"}{" "}
            <span>(platform sender)</span>
          </p>
          <p>
            <strong>Recipient:</strong>{" "}
            {value(p.preview.recipient) || "Missing contact destination"}
          </p>
          {value(p.preview.subject) && (
            <p>
              <strong>Subject:</strong> {value(p.preview.subject)}
            </p>
          )}
          <p className="assistant-copy">{value(p.preview.body)}</p>
          {Array.isArray(p.preview.authorizationIssues) &&
            p.preview.authorizationIssues.map((issue, i) => (
              <p key={i}>{String(issue)}</p>
            ))}
        </>
      )}
      {a.kind === "task" && (
        <>
          <h4>{a.title}</h4>
          <p>
            Due {new Date(a.dueAt).toLocaleString()} (
            {Intl.DateTimeFormat().resolvedOptions().timeZone})
          </p>
          <p className="assistant-copy">{a.notes}</p>
        </>
      )}
      {a.kind === "note" && (
        <>
          <h4>{a.title}</h4>
          <p className="assistant-copy">{a.body}</p>
        </>
      )}
      {a.kind === "voice_script" && (
        <>
          <h4>{a.title}</h4>
          <p className="assistant-copy">{a.script}</p>
          <p>Text draft only. No audio generation or approval.</p>
        </>
      )}
      {a.kind === "calendar" && (
        <>
          <h4>{a.title}</h4>
          <p>
            {new Date(a.startsAt).toLocaleString()} –{" "}
            {new Date(a.endsAt).toLocaleString()}
          </p>
          <p>Selected timezone: {a.timeZone}. Internal MyARI event only.</p>
          <p>{value(p.preview.availabilityLimitation)}</p>
          {Array.isArray(p.preview.conflicts) &&
            p.preview.conflicts.length > 0 && (
              <p>Conflicts found. Edit the appointment before saving.</p>
            )}
        </>
      )}
      {a.kind === "campaign" && (
        <>
          <h4>{a.name}</h4>
          <p>
            {a.durationDays} days · {a.audience}
          </p>
          <ol>
            {a.steps.map((s, i) => (
              <li key={i}>
                <details>
                  <summary>
                    Day {s.day} · {s.type} · {s.title}
                  </summary>
                  <p className="assistant-copy">{s.description}</p>
                </details>
              </li>
            ))}
          </ol>
          <p>
            No enrollment or activation. Review consent, personalization,
            attachments and exact approved recordings in the campaign builder.
          </p>
        </>
      )}
      {a.kind === "flyer" && (
        <>
          <h4>{a.headline}</h4>
          <p>{value(p.preview.address)}</p>
          <p>
            {a.price
              ? new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(a.price)
              : "No asking price supplied"}
          </p>
          <p className="assistant-copy">{a.description}</p>
          <p>
            Saved property facts and approved Brand Kit. Review listing rights
            and disclosures before sharing.
          </p>
        </>
      )}
      {a.kind === "financing" && (
        <>
          <h4>Preliminary financing estimate</h4>
          <p>
            Calculated from the displayed assumptions. No lender quote or
            endorsement.
          </p>
          <details>
            <summary>Calculation and assumptions</summary>
            <pre>
              {JSON.stringify(
                { input: a.calculation, result: p.preview.result },
                null,
                2,
              )}
            </pre>
          </details>
        </>
      )}
      {a.kind === "checklist" && (
        <>
          <h4>Transaction checklist</h4>
          <p>
            Base date {a.baseDate} · Closing date{" "}
            {a.closingDate ?? "Not supplied"} · {a.timeZone}
          </p>
          <details>
            <summary>Review proposed steps and deadlines</summary>
            <pre>
              {JSON.stringify(
                {
                  template: p.preview.template,
                  deadlines: p.preview.proposedDeadlines,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </>
      )}
      {a.kind === "property_preferences" && (
        <>
          <h4>Buyer search preferences</h4>
          <p>
            Area: {a.preferredArea ?? "Unchanged"} · Budget:{" "}
            {a.budget ?? "Unchanged"}
          </p>
          <p>
            {Object.entries(a.propertyPreferences)
              .filter(([, v]) => v != null)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ")}
          </p>
        </>
      )}
      {a.kind === "follow_up" && (
        <>
          <p>{a.recommendation}</p>
          <p>Why: {a.reason}</p>
        </>
      )}
      <details>
        <summary>Record references and full structured preview</summary>
        <pre>{JSON.stringify(p.preview, null, 2)}</pre>
      </details>
    </div>
  );
}
