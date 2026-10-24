import { ZillowReviewUrlSchema } from "@/lib/reviews/model";
import { AssistantPreferencesSchema } from "@/lib/assistant/preferences";
import { z } from "zod";
const text = z.string().trim().max(300).default("");
const https = z
  .union([
    z.literal(""),
    z
      .string()
      .url()
      .refine((s) => new URL(s).protocol === "https:", "Use an https URL"),
  ])
  .default("");
export const BrandKitSchema = z.object({
  assistantPreferences: AssistantPreferencesSchema.optional(),
  agentName: text,
  jobTitle: text,
  businessName: text,
  phone: text,
  email: z.union([z.literal(""), z.string().email()]).default(""),
  website: https,
  zillowReviewUrl: ZillowReviewUrlSchema.default(""),
  reviewRequestsEnabled: z.boolean().default(true),
  preferredAiVoiceProfileId: z.string().uuid().nullable().default(null),
  address: text,
  bio: z.string().max(3000).default(""),
  licenseNumber: text,
  brokerageInfo: z.string().max(1500).default(""),
  disclosures: z.string().max(3000).default(""),
  headshotPath: text,
  logoPath: text,
  useProfilePhoto: z.boolean().default(false),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#A77B58"),
  secondaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#F8F5EF"),
  font: z
    .enum(["Georgia", "Arial", "Inter", "Cormorant Garamond"])
    .default("Georgia"),
  socials: z
    .object({ instagram: https, facebook: https, linkedin: https })
    .default({ instagram: "", facebook: "", linkedin: "" }),
  approved: z.boolean().default(false),
  onboardingDismissed: z.boolean().default(false),
  personalizationReviewed: z.boolean().default(false),
  notificationsReviewed: z.boolean().default(false),
});
export type BrandKit = z.infer<typeof BrandKitSchema>;
export const emptyBrandKit = () => BrandKitSchema.parse({});
export function ownedBrandPath(owner: string, path: string) {
  if (!path) return true;
  const prefix = `${owner}/branding/`;
  return (
    path.startsWith(prefix) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/i.test(
      path.slice(prefix.length),
    )
  );
}
export function imageFileValid(type: string, bytes: Uint8Array) {
  if (!bytes.length || bytes.length > 4 * 1024 * 1024) return false;
  if (type === "image/png")
    return bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  if (type === "image/jpeg")
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/webp")
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  return false;
}
export function onboardingSteps(input: {
  kit: BrandKit;
  profileComplete: boolean;
  hasLender: boolean;
  hasTitle: boolean;
  twilioVerified: boolean;
  googleVerified: boolean;
  campaigns: number;
  contacts: number;
}) {
  const k = input.kit;
  return [
    {
      id: "profile",
      title: "Complete profile",
      done: input.profileComplete,
      href: "/dashboard/settings?tab=profile",
    },
    {
      id: "headshot",
      title: "Upload professional headshot",
      done: !!k.headshotPath || k.useProfilePhoto,
      href: "/dashboard/settings?tab=brand",
    },
    {
      id: "brokerage",
      title: "Add brokerage branding",
      done: !!k.businessName && !!k.logoPath && k.approved,
      href: "/dashboard/settings?tab=brand",
    },
    {
      id: "contact",
      title: "Configure business contact information",
      done: !!k.agentName && !!k.phone && !!k.email,
      href: "/dashboard/settings?tab=brand",
    },
    {
      id: "lender",
      title: "Add preferred lender",
      done: input.hasLender,
      href: "/dashboard/mortgage",
    },
    {
      id: "title",
      title: "Add preferred title company",
      done: input.hasTitle,
      href: "/dashboard/mortgage",
    },
    {
      id: "twilio",
      title: "Verify Twilio business number",
      done: input.twilioVerified,
      href: "/dashboard/settings?tab=integrations",
    },
    {
      id: "google",
      title: "Verify Google Calendar connection",
      done: input.googleVerified,
      href: "/dashboard/calendar",
    },
    {
      id: "notifications",
      title: "Review notification preferences",
      done: k.notificationsReviewed,
      href: "/dashboard/settings?tab=notifications",
    },
    {
      id: "campaign",
      title: "Create first campaign",
      done: input.campaigns > 0,
      href: "/dashboard/campaigns",
    },
    {
      id: "contacts",
      title: "Add or import contacts",
      done: input.contacts > 0,
      href: "/dashboard/contacts",
    },
    {
      id: "personalization",
      title: "Review campaign personalization settings",
      done: k.personalizationReviewed,
      href: "/dashboard/settings?tab=brand",
    },
  ];
}
