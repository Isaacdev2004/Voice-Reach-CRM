export const clerkAppearance = {
  variables: {
    colorPrimary: "#946947",
    colorText: "#191c1e",
    colorTextSecondary: "#6B5E54",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#191c1e",
    borderRadius: "12px",
    fontFamily:
      "var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full rounded-xl shadow-none overflow-visible",
    card: "bg-transparent shadow-none border-0 rounded-xl p-0 gap-4 w-full overflow-visible",
    main: "gap-4 w-full",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "h-11 w-full rounded-xl border border-outline-variant/40 bg-white text-[14px] font-medium text-ink hover:bg-cream",
    socialButtonsBlockButtonText: "text-[14px] font-medium",
    socialButtons: "w-full",
    dividerRow: "my-2 w-full",
    dividerLine: "bg-outline-variant/40",
    dividerText: "text-taupe text-[12px]",
    form: "w-full gap-4",
    formFieldRow: "w-full",
    formFieldLabel: "text-[13px] font-medium text-ink",
    formFieldInput:
      "h-11 w-full rounded-xl border border-outline-variant/40 bg-white px-4 text-[14px] focus:border-rose-gold/50 focus:ring-2 focus:ring-rose-gold/15",
    formButtonPrimary:
      "h-11 w-full rounded-xl bg-[#946947] text-[14px] font-semibold text-white shadow-sm hover:bg-[#7c563a]",
    footer: "!hidden",
    footerAction: "!hidden",
    footerActionLink: "!hidden",
    footerPages: "!hidden",
    footerPagesLink: "!hidden",
    badge: "!hidden",
    identityPreviewEditButton: "text-rose-gold-deep",
    formFieldInputShowPasswordButton: "text-taupe",
    alert: "rounded-xl text-[13px]",
    otpCodeFieldInput: "rounded-xl border border-outline-variant/40",
    logoBox: "hidden",
    logoImage: "hidden",
  },
  layout: {
    socialButtonsPlacement: "top" as const,
    showOptionalFields: true,
  },
};

/** Scoped form appearance: recovery/verification headers must remain visible. */
export const luxuryAuthAppearance = {
  ...clerkAppearance,
  elements: {
    ...clerkAppearance.elements,
    header: { display: "block" as const },
    headerTitle: { display: "block" as const },
    headerSubtitle: { display: "block" as const },
  },
  layout: {
    ...clerkAppearance.layout,
    socialButtonsPlacement: "bottom" as const,
  },
};
