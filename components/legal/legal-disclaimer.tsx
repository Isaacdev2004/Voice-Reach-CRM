export function LegalDisclaimer({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-10 border-t border-outline-variant/15 pt-6 text-[13px] italic leading-relaxed text-taupe">
      {children}
    </p>
  );
}
