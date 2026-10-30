"use client";
import { useEffect, useRef } from "react";
export function CapabilityDetails({ title, explanation, onClose, onStart }: { title: string; explanation: string; onClose: () => void; onStart: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { element?.close(); if (prior?.isConnected) prior.focus(); };
  }, []);
  return <dialog ref={dialog} className="aw-capability-dialog" aria-label={`About ${title}`} onCancel={event => { event.preventDefault(); onClose(); }}>
    <button type="button" className="aw-capability-close" aria-label="Close capability details" onClick={onClose}>×</button>
    <p className="aw-capability-eyebrow">Explore MyARI</p><h2>{title}</h2>
    <p>{explanation}</p>
    <p className="aw-capability-safety">Your workspace only. Usage limits and approval safeguards apply.</p>
    <div><button type="button" onClick={onClose}>Back to workspace</button><button type="button" className="assistant-primary" onClick={onStart}>Start {title} →</button></div>
  </dialog>;
}
