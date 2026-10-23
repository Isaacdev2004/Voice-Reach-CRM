"use client";
import { useEffect, useState } from "react";
export function BookingRequestsPanel({ onChanged }: { onChanged: () => void }) {
  const [requests, setRequests] = useState<
      {
        id: string;
        guest_name: string;
        guest_email: string;
        starts_at: string;
      }[]
    >([]),
    [message, setMessage] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/calendar/booking-requests", {
      signal: ac.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error();
        if (!ac.signal.aborted) setRequests(d.requests ?? []);
      })
      .catch(() => {
        if (!ac.signal.aborted)
          setMessage("Booking requests could not be loaded.");
      });
    return () => ac.abort();
  }, [revision]);
  if (!requests.length && !message) return null;
  return (
    <section className="calendar-panel">
      <h2>Booking requests</h2>
      {requests.map((r) => (
        <div key={r.id} className="calendar-provider">
          <strong>{r.guest_name}</strong>
          <p>{r.guest_email}</p>
          <p>{new Date(r.starts_at).toLocaleString()}</p>
          <div className="calendar-actions">
            {(["confirm", "decline"] as const).map((action) => (
              <button
                key={action}
                onClick={async () => {
                  if (
                    !confirm(
                      `${action === "confirm" ? "Confirm this local appointment" : "Decline this request"}? No invitations or messages will be sent.`,
                    )
                  )
                    return;
                  const res = await fetch("/api/calendar/booking-requests", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: r.id, action }),
                  });
                  const d = await res.json();
                  setMessage(
                    d.message ??
                      (res.ok
                        ? "Request updated."
                        : "Request could not be updated. Refresh and review the calendar."),
                  );
                  if (res.ok) {
                    setRevision((v) => v + 1);
                    onChanged();
                  }
                }}
              >
                {action === "confirm" ? "Confirm locally" : "Decline"}
              </button>
            ))}
          </div>
        </div>
      ))}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
