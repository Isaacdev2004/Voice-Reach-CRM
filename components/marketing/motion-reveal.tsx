"use client";

import { cn } from "@/lib/cn";
import {
  type CSSProperties,
  type ElementType,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay after the element enters the viewport. */
  delayMs?: number;
  as?: ElementType;
};

/** Fade and rise when scrolled into view (once). */
export function Reveal({ children, className, delayMs = 0, as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const Component = Tag as "div";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const style: CSSProperties | undefined =
    delayMs > 0 ? { transitionDelay: visible ? `${delayMs}ms` : "0ms" } : undefined;

  return (
    <Component
      ref={ref}
      className={cn(
        "will-change-[transform,opacity] transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        className,
      )}
      style={style}
    >
      {children}
    </Component>
  );
}

type RevealStaggerProps = {
  children: ReactNode;
  className?: string;
  /** Delay between each direct child. */
  stepMs?: number;
  as?: ElementType;
};

export function RevealStagger({
  children,
  className,
  stepMs = 90,
  as: Tag = "div",
}: RevealStaggerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const Component = Tag as "div";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Component ref={ref} className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <div
              key={index}
              className={cn(
                "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
              )}
              style={{
                transitionDelay: visible ? `${index * stepMs}ms` : "0ms",
              }}
            >
              {child}
            </div>
          ))
        : children}
    </Component>
  );
}

type HeroEntranceProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
};

/** Above-the-fold hero copy — animates on first paint. */
export function HeroEntrance({ children, className, delayMs = 0 }: HeroEntranceProps) {
  return (
    <div
      className={cn("animate-marketing-rise motion-reduce:animate-none motion-reduce:opacity-100", className)}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
