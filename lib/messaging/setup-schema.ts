import { z } from "zod";
const httpsUrl = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine((value) => {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  }, "Use a public HTTPS URL.");
export const MessagingSetupSchema = z
  .object({
    businessName: z.string().trim().min(2).max(160),
    agentName: z.string().trim().min(2).max(160),
    businessEmail: z.string().trim().email().max(254),
    businessPhone: z
      .string()
      .trim()
      .regex(
        /^\+[1-9]\d{7,14}$/,
        "Use an international phone number, such as +14075550100.",
      ),
    website: httpsUrl,
    privacyUrl: httpsUrl,
    termsUrl: httpsUrl,
    address: z.string().trim().min(5).max(300),
    country: z.literal("US"),
    businessType: z.enum(["registered_business", "sole_proprietor"]),
    channels: z
      .array(z.enum(["sms", "email", "voicemail"]))
      .min(1)
      .max(3)
      .refine((v) => new Set(v).size === v.length),
    useCase: z.string().trim().min(20).max(1200),
    consentDescription: z.string().trim().min(20).max(1200),
    responsibleParty: z.enum(["agent", "team", "brokerage"]).optional(),
    brokerageName: z.string().trim().max(160).optional(),
    authorizationDescription: z.string().trim().max(1000).optional(),
    optInUrl: httpsUrl.optional(),
    messageSamples: z.string().trim().max(1200).optional(),
    expectedMonthlyVolume: z.number().int().min(0).max(1000000).optional(),
    consentAcknowledged: z.literal(true),
  })
  .strict();
export type MessagingSetup = z.infer<typeof MessagingSetupSchema>;
