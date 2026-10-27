"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { DemoVideo } from "@/components/landing/demo-video";
import { overviewContext } from "@/lib/marketing/overview-context";
import { readUtmAttribution } from "@/lib/marketing/utm";
import { trackMarketingEvent } from "@/lib/marketing/track";

export function AuthExplore() {
  const [view, setView] = useState<"watch" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [updatesConsent, setUpdatesConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState<
    "checking" | "available" | "unavailable"
  >("checking");
  const inFlight = useRef(false);
  const requestId = useRef<string | null>(null);
  const panel = useRef<HTMLDetailsElement>(null);

  const chooseEmail = async () => {
    setView("email");
    setAvailability("checking");
    try {
      const response = await fetch("/api/marketing/overview", {
        cache: "no-store",
      });
      const data = await response.json();
      setAvailability(
        response.ok && data?.available === true ? "available" : "unavailable",
      );
    } catch {
      setAvailability("unavailable");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus("sending");
    setError("");
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/marketing/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          updatesConsent,
          website,
          requestId: requestId.current,
          context: overviewContext(
            window.location.search,
            readUtmAttribution(),
          ),
        }),
      });
      const data = await response.json().catch(() => null);
      if (
        !response.ok ||
        data?.capture !== "accepted" ||
        data?.delivery !== "accepted"
      ) {
        throw Error(
          data?.code === "overview_delivery_unconfirmed"
            ? "Your request reached MyARI, but your email isn’t confirmed yet. Please retry."
            : "We couldn’t confirm your overview email. Please retry, watch the walkthrough, or contact us below.",
        );
      }
      setStatus("done");
      setEmail("");
      // Event contains no email address, consent choice, or request identifier.
      trackMarketingEvent("contact_form_submit", {
        location: "auth-explore",
        type: "overview",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Please try again shortly.",
      );
      setStatus("idle");
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <details
      ref={panel}
      className="auth-explore"
      onToggle={() => {
        if (!panel.current?.open)
          panel.current
            ?.querySelectorAll("video")
            .forEach((video) => video.pause());
      }}
    >
      <summary>
        Not ready to start?{" "}
        <strong>
          Explore MyARI first <span aria-hidden="true">＋</span>
        </strong>
      </summary>
      <div className="auth-explore-panel">
        <h3>Make yourself at home.</h3>
        <p>Take a closer look, at your own pace. No account needed.</p>
        <div className="auth-explore-options">
          <button
            type="button"
            aria-pressed={view === "watch"}
            onClick={() => setView("watch")}
          >
            <span aria-hidden="true">▷</span> Watch the walkthrough
          </button>
          <button
            type="button"
            aria-pressed={view === "email"}
            onClick={() => void chooseEmail()}
          >
            <span aria-hidden="true">✉</span> Email me an overview
          </button>
        </div>
        {view === "watch" && <DemoVideo compact />}
        {view === "email" &&
          (availability === "checking" ? (
            <p className="auth-overview-privacy" role="status">
              Checking overview availability…
            </p>
          ) : availability === "unavailable" ? (
            <p className="auth-overview-privacy" role="status">
              Overview emails aren’t available here yet. You can watch the
              walkthrough or request a personal introduction below. No email
              address has been collected.
            </p>
          ) : status === "done" ? (
            <div className="auth-overview-done" role="status">
              <h4>Your overview is on its way.</h4>
              <p>
                MyARI received your request and the email provider accepted your
                overview. Check your inbox and spam folder.
              </p>
              <button type="button" onClick={() => setView("watch")}>
                Watch the walkthrough now <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : (
            <form className="auth-overview-form" onSubmit={submit}>
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={320}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "sending"}
                  placeholder="you@example.com"
                />
              </label>
              <label className="auth-overview-honeypot" aria-hidden="true">
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
              <label className="auth-updates-consent">
                <input
                  type="checkbox"
                  checked={updatesConsent}
                  onChange={(e) => setUpdatesConsent(e.target.checked)}
                  disabled={status === "sending"}
                />
                <span>
                  I’d also like MyARI product updates by email (optional).
                </span>
              </label>
              <p className="auth-overview-privacy">
                We’ll use your email to send this overview. No account, trial,
                or automatic marketing enrollment.{" "}
                <Link href="/privacy">Privacy Policy</Link>
              </p>
              {error && (
                <p className="auth-overview-error" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="auth-overview-submit"
                disabled={status === "sending"}
              >
                {status === "sending"
                  ? "Sending your overview…"
                  : "Email my overview"}
              </button>
            </form>
          ))}
        <Link href="/contact" className="auth-introduction">
          Prefer a conversation? Request a personal introduction{" "}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </details>
  );
}
