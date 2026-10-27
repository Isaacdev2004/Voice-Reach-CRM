import Image from "next/image";
import Link from "next/link";
import { AriLogo } from "@/components/brand/ari-logo";

type AuthBrandPanelProps = { mode: "sign-in" | "sign-up" };

export function AuthBrandPanel({ mode }: AuthBrandPanelProps) {
  return (
    <aside className="auth-editorial" aria-label="The MyARI mindset">
      <Image
        src="/brand/marketing/public-architectural-hero.webp"
        alt="Sunlight across a warm stone desk overlooking a peaceful lake"
        fill
        priority
        sizes="(min-width: 1024px) 54vw, 100vw"
        className="auth-editorial-image"
      />
      <div className="auth-editorial-shade" />
      <Link href="/" className="auth-editorial-brand" aria-label="MyARI home">
        <AriLogo height={58} />
        <span>THE ART OF STAYING CONNECTED</span>
      </Link>
      <div className="auth-editorial-copy">
        <p className="auth-eyebrow">A LITTLE MOMENTUM, EVERY DAY</p>
        <h1>
          {mode === "sign-up" ? "Make room for" : "Welcome to your"}
          <br />
          <em>{mode === "sign-up" ? "what comes next." : "next chapter."}</em>
        </h1>
        <div className="auth-quote-rule" aria-hidden="true" />
        <blockquote>
          “The relationships you nurture today become the opportunities you
          celebrate tomorrow.”
        </blockquote>
        <p className="auth-quote-credit">THE MYARI MINDSET</p>
      </div>
      <div className="auth-editorial-footer">
        <span>Thoughtful follow-up. Lasting relationships.</span>
        <span className="auth-editorial-spark" aria-hidden="true">
          ✧
        </span>
      </div>
    </aside>
  );
}
