"use client";
import { useEffect, useRef } from "react";
export type AssistantConfirmation = { message: string; accept: () => void };
/** Native dialog focus/inert behavior without synchronously blocking the event loop. */
export function Confirmation({ value, onClose }: { value: AssistantConfirmation; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { element?.close(); if (prior?.isConnected) prior.focus(); };
  }, []);
  return <dialog ref={dialog} className="aw-confirmation" aria-label="Confirm Assistant action" onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2>Before you continue</h2>
    <p>{value.message}</p>
    <div><button type="button" onClick={onClose}>Cancel</button><button type="button" onClick={() => { onClose(); value.accept(); }}>Continue</button></div>
  </dialog>;
}
