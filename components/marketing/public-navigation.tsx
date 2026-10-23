"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AriLogo } from "@/components/brand/ari-logo";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { PUBLIC_NAV_GROUPS } from "@/lib/seo/marketing-nav";

/** Standard disclosure navigation: Tab follows links, Escape restores its trigger. */
export function PublicNavigation() {
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const root = useRef<HTMLElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [pathname]);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(null);
        setMobile(false);
      }
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const target = open
        ? root.current?.querySelector<HTMLButtonElement>(
            `[data-nav-trigger="${open}"]`,
          )
        : mobile
          ? root.current?.querySelector<HTMLButtonElement>(
              ".public-menu-toggle",
            )
          : null;
      setOpen(null);
      setMobile(false);
      target?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, mobile]);
  const close = () => {
    setOpen(null);
    setMobile(false);
  };
  return (
    <header className="public-header" ref={root}>
      <nav className="landing-shell public-nav" aria-label="Main navigation">
        <Link href="/" className="public-wordmark" aria-label="MyARI home">
          <AriLogo height={50} />
          <span>MyARI</span>
        </Link>
        <div className="public-desktop-links">
          {PUBLIC_NAV_GROUPS.map((group) => (
            <div className="public-disclosure" key={group.label}>
              <button
                type="button"
                data-nav-trigger={group.label}
                aria-expanded={open === group.label}
                aria-controls={`public-${group.label}`}
                onClick={() =>
                  setOpen(open === group.label ? null : group.label)
                }
              >
                {group.label}
                <span aria-hidden>⌄</span>
              </button>
              {open === group.label && (
                <div className="public-dropdown" id={`public-${group.label}`}>
                  {group.links.map((link) => (
                    <Link key={link.href} href={link.href} onClick={close}>
                      {link.label}
                      <span aria-hidden>↗</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link href="/pricing">Pricing</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <div className="public-nav-actions">
          <Link className="public-login" href="/sign-in">
            Log in
          </Link>
          <StartFreeButton
            location="public-navigation"
            showArrow
            className="public-trial-button"
          />
          <button
            type="button"
            className="public-menu-toggle"
            aria-label={mobile ? "Close navigation" : "Open navigation"}
            aria-expanded={mobile}
            aria-controls="public-mobile-navigation"
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? "✕" : "☰"}
          </button>
        </div>
      </nav>
      {mobile && (
        <nav
          id="public-mobile-navigation"
          className="public-mobile-navigation"
          aria-label="Mobile navigation"
        >
          {PUBLIC_NAV_GROUPS.map((group) => (
            <details key={group.label}>
              <summary>{group.label}</summary>
              {group.links.map((link) => (
                <Link href={link.href} key={link.href} onClick={close}>
                  {link.label}
                </Link>
              ))}
            </details>
          ))}
          <Link href="/pricing" onClick={close}>
            Pricing
          </Link>
          <Link href="/contact" onClick={close}>
            Contact
          </Link>
          <Link href="/sign-in" onClick={close}>
            Log in
          </Link>
        </nav>
      )}
    </header>
  );
}
