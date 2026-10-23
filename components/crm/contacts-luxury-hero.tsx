import Image from "next/image";
import { ContactPageActions } from "./contact-page-actions";

export function ContactsLuxuryHero({ onRefresh }: { onRefresh: () => void }) {
  return (
    <section className="contacts-luxury-hero" aria-labelledby="contacts-heading">
      <div className="contacts-hero-photo"><Image src="/brand/heroes/dashboard-interior.jpg" alt="Sunlit living room with cream furnishings and sea views" fill priority sizes="(max-width: 767px) 100vw, 65vw" className="object-cover" /></div>
      <div className="contacts-hero-copy">
        <p className="contacts-eyebrow">CONTACTS</p>
        <h1 id="contacts-heading">Your relationships, elevated.</h1>
        <p>Manage, nurture, and turn more conversations into opportunities.</p>
        <div className="contacts-hero-actions"><ContactPageActions variant="compact" onRefresh={onRefresh} /></div>
      </div>
      <blockquote className="contacts-hero-quote">Every connection holds potential.</blockquote>
    </section>
  );
}
