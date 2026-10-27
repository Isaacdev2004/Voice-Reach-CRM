import Image from "next/image";

type AuthBrandPanelProps = { mode: "sign-in" | "sign-up" };

export function AuthBrandPanel({ mode }: AuthBrandPanelProps) {
  return (
    <aside className="auth-editorial" aria-label="The MyARI mindset">
      <Image
        src="/brand/marketing/public-architectural-hero.webp"
        alt="Sunlight across a warm stone desk overlooking a peaceful lake"
        fill
        priority
        sizes="100vw"
        className="auth-editorial-image"
      />
      <div className="auth-editorial-shade" />
      <div className="auth-editorial-copy">
        <p className="auth-eyebrow">THE ART OF STAYING CONNECTED</p>
        <h1>
          {mode === "sign-up" ? "Make room for" : "Welcome to your"}
          <br />
          <em>{mode === "sign-up" ? "what comes next." : "next chapter."}</em>
        </h1>
        <div className="auth-quote-rule" aria-hidden="true" />
        <blockquote>
          “Your next chapter starts with the relationships you build today.”
        </blockquote>
        <p className="auth-quote-credit">THE MYARI MINDSET</p>
      </div>
    </aside>
  );
}
