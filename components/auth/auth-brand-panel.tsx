import Image from "next/image";
import Link from "next/link";
import { AriLogo } from "@/components/brand/ari-logo";

const features = [
  {
    title: "Automated Follow-Up",
    copy: "Turn more leads into opportunities.",
    icon: "people",
  },
  {
    title: "Organized Relationships",
    copy: "Keep your pipeline moving.",
    icon: "chart",
  },
  {
    title: "AI-Powered Tools",
    copy: "Save time and work smarter.",
    icon: "spark",
  },
  {
    title: "A Business Built for You",
    copy: "So you can focus on what matters.",
    icon: "case",
  },
] as const;
function FeatureIcon({ kind }: { kind: (typeof features)[number]["icon"] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "people" ? (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5" />
        </>
      ) : kind === "chart" ? (
        <>
          <path d="M4 20h16M5 15h3v5H5zm6-5h3v10h-3zm6-5h3v15h-3zM4 10l6-5 3 1 6-4" />
        </>
      ) : kind === "spark" ? (
        <>
          <path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3zM20 3v4m-2-2h4" />
        </>
      ) : (
        <>
          <rect x="3" y="7" width="18" height="14" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
        </>
      )}
    </svg>
  );
}
export function AuthBrandPanel({
  mode: _mode,
}: {
  mode: "sign-in" | "sign-up";
}) {
  return (
    <aside className="auth-editorial" aria-label="The MyARI experience">
      <Image
        src="/brand/marketing/luxury-auth-architecture.webp"
        alt="A sunlit lakeside residence with open glass doors, warm stone and elegant natural materials"
        fill
        priority
        sizes="(min-width: 1100px) 58vw, (min-width: 760px) 48vw, 100vw"
        className="auth-editorial-image"
      />
      <div className="auth-editorial-shade" />
      <div className="auth-editorial-inner">
        <Link href="/" className="auth-editorial-brand" aria-label="MyARI home">
          <AriLogo height={94} />
          <span>
            THE ART OF
            <br />
            STRONGER CONNECTIONS
          </span>
        </Link>
        <div className="auth-editorial-copy">
          <h1>
            Every connection
            <br />
            holds <em>potential.</em>
          </h1>
          <div className="auth-headline-rule" aria-hidden="true" />
          <p className="auth-editorial-intro">
            A more intentional way to grow
            <br className="auth-desktop-break" /> your real estate business.
          </p>
          <ul className="auth-feature-list">
            {features.map((feature) => (
              <li key={feature.title}>
                <span className="auth-feature-icon">
                  <FeatureIcon kind={feature.icon} />
                </span>
                <div>
                  <h2>{feature.title}</h2>
                  <p>{feature.copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <figure className="auth-brand-quote">
          <blockquote>
            “Technology should create freedom,
            <br /> not more work.”
          </blockquote>
          <figcaption>— MyARI</figcaption>
        </figure>
      </div>
    </aside>
  );
}
