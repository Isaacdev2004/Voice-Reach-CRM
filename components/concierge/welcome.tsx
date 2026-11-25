"use client";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { readApiResponse } from "@/lib/api-response";
import "./concierge.css";
type Welcome = {showWelcome: boolean; showCard: boolean; complete: boolean; checklistReady: boolean; progress: {completed: number; total: number}; next: string; href: string};
export function ConciergeWelcome() {
  const {user, isLoaded} = useUser();
  return isLoaded && user ? <WelcomeForAccount key={user.id} /> : null;
}
function WelcomeForAccount() {
  const [data, setData] = useState<Welcome | null>(null), [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null), intent = useRef(0), router = useRouter();
  useEffect(() => {
    let live = true;
    void fetch("/api/concierge/welcome", {cache: "no-store"}).then(async response => {
      if (!response.ok) return;
      const result = await readApiResponse<Welcome>(response);
      if (live && result.success) {setData(result.data); setOpen(result.data.showWelcome);}
    }).catch(() => {});
    return () => {live = false;};
  }, []);
  useEffect(() => {if (open) dialog.current?.showModal(); else dialog.current?.close();}, [open]);
  async function act(action: "begin" | "explore" | "dismissCard" | "acknowledgeCompletion") {
    if (!data) return;
    // Close/escape remains available while a preference request is pending.
    if (action === "explore") {setOpen(false); intent.current++;}
    if (busy) return;
    const currentIntent = ++intent.current;
    setBusy(true); setError("");
    try {
      const result = await readApiResponse<{saved: boolean}>(await fetch("/api/concierge/welcome", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action}),signal:AbortSignal.timeout(10000)}));
      if (!result.success) throw Error("Your preference could not be saved. You can still explore MyARI; please retry below.");
      setOpen(false);
      setData({...data, showWelcome:false, showCard: action === "dismissCard" || action === "acknowledgeCompletion" ? false : data.showCard});
      if (action === "begin" && intent.current === currentIntent) router.push(data.href);
    } catch {setError("Your preference could not be saved. Your workspace remains available; retry when you’re ready.");}
    finally {setBusy(false);}
  }
  if (!data) return null;
  return <div className="concierge concierge-discovery">
    {error && <p role="alert">{error} <button disabled={busy} onClick={() => void act("explore")}>Save dismissal</button></p>}
    {data.showCard && <section className="concierge-dashboard-card" aria-label="Your personalized onboarding">
      <div className="concierge-service-mark" aria-hidden="true">✧</div>
      <div><span className="concierge-eyebrow">White-Glove Setup</span><h2>{data.complete ? "Beautifully prepared. Ready for your next chapter." : "Your MyARI experience begins here."}</h2>
        <p>{data.complete ? "Your personal checklist and independent review are complete. No campaigns have been activated." : "Complete your personalized setup whenever you’re ready."}</p>
        <div className="concierge-card-progress"><progress aria-label="Setup milestone progress" value={data.progress.completed} max={data.progress.total}/><span>{data.progress.completed} of {data.progress.total} milestones</span></div>
        {!data.complete && <p className="concierge-next-action">Next: {data.next}</p>}
      </div>
      <div className="concierge-card-actions"><Link className="concierge-cta" href={data.href}>{data.complete ? "View setup" : "Resume Setup"} →</Link>
        <button disabled={busy} onClick={() => void act(data.complete ? "acknowledgeCompletion" : "dismissCard")}>{data.complete ? "Dismiss confirmation" : "Dismiss reminder"}</button></div>
    </section>}
    <dialog ref={dialog} className="concierge-welcome-dialog" aria-labelledby="concierge-welcome-title" onCancel={e => {e.preventDefault(); void act("explore");}}>
      <div className="concierge-modal-image" role="img" aria-label="A sunlit coastal interior with natural stone and greenery"/>
      <button className="concierge-modal-close" aria-label="Close welcome" onClick={() => void act("explore")}>×</button>
      <div className="concierge-modal-copy"><span className="concierge-eyebrow">MyARI Concierge · a personal welcome</span><h1 id="concierge-welcome-title">A beautiful beginning<br/>for your business.</h1>
        <p>Your workspace is ready. Let us help you personalize it, bring your contacts over, and prepare your first follow-up campaign—all at your own pace.</p>
        <div className="concierge-actions"><button className="concierge-primary" disabled={busy} onClick={() => void act("begin")}>Begin My Setup</button><button disabled={busy} onClick={() => void act("explore")}>Explore MyARI First</button></div>
        <p className="concierge-reassurance">Entirely optional. Resume anytime from White-Glove Setup beside Dashboard.</p>
        {error && <p role="alert">{error}</p>}
      </div>
    </dialog>
  </div>;
}
