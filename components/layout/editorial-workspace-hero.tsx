import Image from "next/image";
import "./editorial-workspace-hero.css";
export function EditorialWorkspaceHero({
  eyebrow,
  title,
  description,
  image,
  quote,
}: {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  quote?: string;
}) {
  return (
    <section className="ew-hero">
      <div className="ew-photo">
        <Image
          src={image}
          alt="Sunlit luxury real estate workspace"
          fill
          priority
          sizes="(max-width:768px) 100vw, 1400px"
          style={{ objectFit: "cover", objectPosition: "right center" }}
        />
      </div>
      <div className="ew-copy">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {quote && <aside>{quote}</aside>}
    </section>
  );
}
