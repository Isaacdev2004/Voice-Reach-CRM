"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Clerk mounts asynchronously; never leave a failed mount as an empty card. */
export function ClerkMountGuard({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const inspect = () => {
      if (element.querySelector(".cl-rootBox input, .cl-rootBox button, .cl-rootBox form")) setState("ready");
    };
    const observer = new MutationObserver(inspect);
    observer.observe(element, { childList: true, subtree: true });
    inspect();
    const timeout = window.setTimeout(() => {
      if (!element.querySelector(".cl-rootBox input, .cl-rootBox button, .cl-rootBox form")) setState("error");
    }, 12000);
    return () => { observer.disconnect(); window.clearTimeout(timeout); };
  }, []);
  return <>
    <div ref={root}>{children}</div>
    {state === "loading" && <p role="status" className="py-4 text-[14px] text-slate-text">Connecting securely to sign in…</p>}
    {state === "error" && <div role="alert" className="rounded-xl border border-outline-variant/40 p-4 text-[14px] text-ink">
      <p>Secure sign-in could not load. Check that your browser can reach the authentication service, then retry. No sign-in attempt was submitted.</p>
      <button type="button" className="mt-3 rounded-xl border border-outline-variant/40 px-4 py-2" onClick={() => window.location.reload()}>Retry sign in</button>
    </div>}
  </>;
}
