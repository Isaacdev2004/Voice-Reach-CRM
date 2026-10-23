"use client";
import { useEffect, useState, use } from "react";
export default function BookingPage({
  params,
}: {
  params: Promise<{
    token: string;
  }>;
}) {
  const { token } = use(params);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)),
    [slots, setSlots] = useState<
      {
        start: string;
        end: string;
      }[]
    >([]),
    [zone, setZone] = useState(""),
    [title, setTitle] = useState("Request an appointment"),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState<{
      id: string;
      manageToken: string;
      status?: string;
    } | null>(null),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const q = new URLSearchParams(location.hash.slice(1));
    const id = q.get("request"),
      manageToken = q.get("manage");
    if (id && manageToken && /^[-\w]{43}$/.test(manageToken))
      setReceipt({ id, manageToken, status: "unknown" });
  }, []);
  useEffect(() => {
    const ac = new AbortController();
    setMessage("");
    setSlots([]);
    setSelected("");
    fetch(`/api/calendar/book/${token}?date=${date}`, {
      cache: "no-store",
      signal: ac.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error();
        if (!ac.signal.aborted) {
          setSlots(d.slots);
          setZone(d.timezone);
          setTitle(d.title);
        }
      })
      .catch(() => {
        if (!ac.signal.aborted)
          setMessage(
            "Availability could not be verified. Contact your agent or try another date.",
          );
      });
    return () => ac.abort();
  }, [token, date, revision]);
  return (
    <main className="min-h-screen bg-[#f8f5ef] p-5 text-[#292520]">
      <div className="mx-auto mt-8 w-full max-w-[640px] rounded-[24px] border border-[#e9e2d9] bg-white p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-widest text-[#96633f]">
          MyARI · Appointment requests
        </p>
        <h1 className="my-3 font-serif text-[32px]">{title}</h1>
        <p className="text-[13px] leading-relaxed text-[#716960]">
          Choose an available time to request an appointment. Your agent must
          review and confirm it. No invitations or notifications are sent
          automatically.
        </p>
        <form
          className="mt-5 grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const slot = slots.find((s) => s.start === selected);
            if (!slot) return;
            setBusy(true);
            try {
              const r = await fetch(`/api/calendar/book/${token}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...slot,
                  name,
                  email,
                  ...(receipt
                    ? { replace: receipt.id, manageToken: receipt.manageToken }
                    : {}),
                }),
              });
              const d = await r.json();
              if (!r.ok) throw Error(d.error);
              setReceipt({
                id: d.id,
                manageToken: d.manageToken,
                status: "pending",
              });
              history.replaceState(
                null,
                "",
                location.pathname +
                  "#" +
                  new URLSearchParams({ request: d.id, manage: d.manageToken }),
              );
              setMessage(d.message);
              setSlots([]);
            } catch (e) {
              setMessage(
                e instanceof Error
                  ? e.message
                  : "Your request could not be saved.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="grid gap-1 text-[13px]">
            Date
            <input
              className="rounded-xl border border-[#e9e2d9] p-3"
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <p className="text-[12px] text-[#716960]">
            Times use {zone || "the agent’s timezone"}.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {slots.map((s) => (
              <button
                type="button"
                aria-pressed={selected === s.start}
                className={`rounded-xl border p-2 text-[12px] ${selected === s.start ? "border-[#96633f] bg-[#f3eee6]" : "border-[#e9e2d9]"}`}
                key={s.start}
                onClick={() => setSelected(s.start)}
              >
                {new Date(s.start).toLocaleTimeString("en-US", {
                  timeZone: zone,
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </button>
            ))}
          </div>
          {!slots.length ? (
            <p className="text-[12px] text-[#716960]">
              No verified times currently displayed. Try a different date.
            </p>
          ) : null}
          <label className="grid gap-1 text-[13px]">
            Name
            <input
              required
              maxLength={100}
              className="rounded-xl border border-[#e9e2d9] p-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-[13px]">
            Email
            <input
              required
              type="email"
              maxLength={254}
              className="rounded-xl border border-[#e9e2d9] p-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button
            disabled={
              busy || !selected || (!!receipt && receipt.status !== "pending")
            }
            className="rounded-full bg-[#9c6d49] px-5 py-3 text-white disabled:opacity-40"
          >
            {busy
              ? "Saving…"
              : receipt
                ? "Request a new time"
                : "Request appointment"}
          </button>
        </form>
        {message ? (
          <p className="my-4 text-[13px]" role="status">
            {message}
          </p>
        ) : null}
        {receipt ? (
          <div className="mt-4 rounded-xl bg-[#f8f5ef] p-4 text-[12px]">
            <strong>
              {receipt.status === "confirmed"
                ? "Appointment confirmed by your agent"
                : receipt.status === "cancelled"
                  ? "Request cancelled"
                  : receipt.status === "unknown"
                    ? "Saved request — check status"
                    : "Request received — awaiting agent confirmation"}
            </strong>
            <p className="my-2">
              Save this private page link to manage your request. Anyone with
              the link can access it. Pending requests can be rescheduled or
              cancelled; contact your agent to change a confirmed appointment.
            </p>
            <button
              className="mb-3 block underline"
              onClick={async () => {
                try {
                  const r = await fetch(
                    `/api/calendar/book/${token}?id=${receipt.id}`,
                    {
                      headers: {
                        Authorization: `Bearer ${receipt.manageToken}`,
                      },
                      cache: "no-store",
                    },
                  );
                  const d = await r.json();
                  if (!r.ok) throw Error();
                  setReceipt({ ...receipt, status: d.request.status });
                  setName(d.request.guest_name);
                  setEmail(d.request.guest_email);
                  setMessage(
                    d.request.status === "confirmed"
                      ? "Your agent confirmed this appointment. Contact your agent for further changes."
                      : d.request.status === "cancelled"
                        ? "This request has been cancelled."
                        : "Your request is awaiting agent review.",
                  );
                } catch {
                  setMessage(
                    "Request status could not be verified. Please contact your agent.",
                  );
                }
              }}
            >
              Check request status
            </button>
            {receipt.status === "pending" ? (
              <>
                <button
                  className="mr-3 underline"
                  onClick={() => setRevision((v) => v + 1)}
                >
                  Choose a new time
                </button>
                <button
                  className="text-[#8b4039] underline"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await fetch(`/api/calendar/book/${token}`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(receipt),
                      });
                      if (!r.ok) throw Error();
                      setReceipt(null);
                      setMessage("Your booking request has been cancelled.");
                      setRevision((v) => v + 1);
                    } catch {
                      setMessage(
                        "Cancellation could not be saved. Please contact your agent.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                >
                  Cancel request
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
