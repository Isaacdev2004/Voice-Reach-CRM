import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY } from "@/lib/legal/company";

export function LegalContactBlock() {
  return (
    <p>
      {LEGAL_ENTITY}
      <br />
      <a className="text-rose-gold-deep underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
        {LEGAL_CONTACT_EMAIL}
      </a>
    </p>
  );
}
