import Link from "next/link";
import { AriLogo } from "@/components/brand/ari-logo";

type RelatedLink = {
  href: string;
  label: string;
};

type LegalPageShellProps = {
  title: string;
  lastUpdated: string;
  subtitle?: string;
  children: React.ReactNode;
  related?: RelatedLink[];
};

export function LegalPageShell({
  title,
  lastUpdated,
  subtitle,
  children,
  related,
}: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="border-b border-outline-variant/15 bg-ivory px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/">
            <AriLogo height={40} />
          </Link>
          <Link
            href="/sign-up"
            className="text-[14px] font-semibold text-rose-gold-deep hover:underline"
          >
            Start Free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-16 md:px-8">
        <h1 className="font-serif text-[36px] font-semibold leading-tight">{title}</h1>
        <p className="mt-3 text-[15px] text-slate-text">
          Last updated: {lastUpdated}
          {subtitle ? ` · ${subtitle}` : null}
        </p>

        {children}

        {related && related.length > 0 ? (
          <p className="mt-8 text-[13px] text-taupe">
            Related:{" "}
            {related.map((link, index) => (
              <span key={link.href}>
                {index > 0 ? " · " : null}
                <Link href={link.href} className="text-rose-gold-deep underline">
                  {link.label}
                </Link>
              </span>
            ))}
          </p>
        ) : null}

        <p className="mt-8 text-center text-[14px] text-taupe">
          <Link href="/" className="font-medium text-rose-gold-deep hover:underline">
            ← Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-serif text-[22px] font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-text">{children}</div>
    </section>
  );
}

export function LegalBulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
