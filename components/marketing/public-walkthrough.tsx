"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DemoVideo } from "@/components/landing/demo-video";
import { StartFreeButton } from "@/components/landing/start-free-button";

const WalkthroughContext = createContext<(() => void) | null>(null);
export function WalkthroughProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [ended, setEnded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const close = () => {
    dialog.current?.querySelectorAll("video").forEach((video) => video.pause());
    dialog.current?.close();
    setOpen(false);
    previousFocus.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = oldOverflow;
    };
  }, [open]);
  const show = () => {
    previousFocus.current = document.activeElement as HTMLElement;
    setEnded(false);
    setOpen(true);
  };
  return (
    <WalkthroughContext.Provider value={show}>
      {children}
      {open &&
        createPortal(
          <dialog
            ref={dialog}
            className="public-video-dialog"
            aria-labelledby="walkthrough-title"
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const controls = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  'button, a[href], video[controls], summary, iframe, [tabindex]:not([tabindex="-1"])',
                ),
              ).filter(
                (node) =>
                  node.getClientRects().length > 0 &&
                  !node.hasAttribute("disabled"),
              );
              const first = controls[0],
                last = controls[controls.length - 1];
              if (!first || !last) return;
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}
            onCancel={(event) => {
              event.preventDefault();
              close();
            }}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                const rect = event.currentTarget.getBoundingClientRect();
                if (
                  event.clientX < rect.left ||
                  event.clientX > rect.right ||
                  event.clientY < rect.top ||
                  event.clientY > rect.bottom
                )
                  close();
              }
            }}
          >
            <header>
              <div>
                <p className="public-eyebrow">Product walkthrough</p>
                <h2 id="walkthrough-title">See MyARI in action</h2>
              </div>
              <button
                type="button"
                aria-label="Close walkthrough"
                onClick={close}
                autoFocus
              >
                ×
              </button>
            </header>
            <DemoVideo compact onEnded={() => setEnded(true)} />
            {ended && (
              <div className="public-video-complete" role="status">
                <h3>Ready to make follow-up effortless?</h3>
                <div className="public-actions">
                  <StartFreeButton
                    location="walkthrough-complete"
                    className="public-trial-button"
                  />
                  <Link href="/features" className="public-outline-button">
                    Explore Features
                  </Link>
                </div>
              </div>
            )}
          </dialog>,
          document.body,
        )}
    </WalkthroughContext.Provider>
  );
}
export function WalkthroughButton({
  editorial = false,
}: {
  editorial?: boolean;
}) {
  const show = useContext(WalkthroughContext);
  return (
    <button
      type="button"
      className="public-outline-button public-watch-button"
      aria-label={editorial ? "Play MyARI product walkthrough" : undefined}
      onClick={show ?? undefined}
    >
      <span aria-hidden="true">▷</span>
      {editorial ? "Watch the walkthrough" : "Watch MyARI in Action"}
    </button>
  );
}
