import { SITE_OFFER } from "@/lib/marketing/site-offer";

export function LegalDisclaimer({ children }: { children?: React.ReactNode }) {
  return (
    <p className="mt-10 border-t border-outline-variant/15 pt-6 text-[13px] leading-relaxed text-taupe">
      {children ?? (
        <>
          Last updated October 2026. Questions about this policy? Contact{" "}
          <a href={`mailto:${SITE_OFFER.supportEmail}`} className="font-medium text-rose-gold-deep hover:underline">
            {SITE_OFFER.supportEmail}
          </a>
          .
        </>
      )}
    </p>
  );
}
