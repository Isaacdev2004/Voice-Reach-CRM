export const clerkAppearance = {
  variables: {
    colorPrimary: "#000000",
    colorText: "#191c1e",
    colorTextSecondary: "#45464d",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#191c1e",
    borderRadius: "9999px",
    fontFamily: "var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "bg-transparent shadow-none border-0 p-0 gap-4",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "h-14 rounded-full border border-outline-variant bg-white font-label-md text-label-md text-ink hover:bg-surface-container-low",
    socialButtonsBlockButtonText: "font-label-md text-label-md",
    dividerLine: "bg-outline-variant/40",
    dividerText: "text-on-surface-variant font-label-md",
    formFieldLabel: "font-label-md text-label-md text-on-surface",
    formFieldInput:
      "h-14 rounded-full border border-outline-variant bg-white px-6 font-body-md text-body-md focus:border-secondary focus:ring-2 focus:ring-secondary/20",
    formButtonPrimary:
      "h-14 rounded-full bg-primary font-label-md text-label-md font-bold text-white shadow-md hover:bg-secondary",
    footerActionLink: "font-bold text-secondary hover:text-secondary",
    identityPreviewEditButton: "text-secondary",
    formFieldInputShowPasswordButton: "text-on-surface-variant",
    alert: "rounded-xl",
    otpCodeFieldInput: "rounded-xl border border-outline-variant",
  },
};
