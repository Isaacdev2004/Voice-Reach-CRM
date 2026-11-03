import { z } from "zod";
import { CalculationSchema } from "./calculators";
const text = (max = 300) => z.string().trim().max(max).default("");
const safeUrl = z
  .union([
    z.literal(""),
    z
      .string()
      .url()
      .refine((x) => x.startsWith("https://"), "Use an HTTPS URL"),
  ])
  .default("");
export const PartnerSchema = z
  .object({
    id: z.string().uuid().optional(),
    kind: z.enum(["lender", "title"]),
    name: z.string().trim().min(1).max(200),
    contact: text(),
    email: z.union([z.literal(""), z.string().email()]).default(""),
    phone: text(50),
    address: text(500),
    website: safeUrl,
    logoUrl: safeUrl,
    headshotUrl: safeUrl,
    serviceAreas: text(1000),
    license: text(500),
    feeReference: text(1000),
    notes: text(3000),
    preferred: z.boolean().default(false),
    brandingAuthorized: z.boolean().default(false),
  })
  .strict();
export type PartnerInput = z.infer<typeof PartnerSchema>;
export type Partner = Omit<PartnerInput, "id"> & { id: string };
export const ContextSchema = z
  .object({
    contactId: z.string().uuid().nullable().default(null),
    propertyContactId: z.string().uuid().nullable().default(null),
    address: text(500),
    county: text(150),
    state: text(100),
    transaction: text(100),
    closingDate: text(30),
    lenderId: z.string().uuid().nullable().default(null),
    titleId: z.string().uuid().nullable().default(null),
    assumptions: text(4000),
    disclosures: text(4000),
    reportTitle: text(200),
    preparedDate: text(30),
    loanType: text(60),
    rateSource: text(250),
    rateAsOf: text(30),
    feeSource: text(250),
    feeAsOf: text(30),
    closingCosts: z.number().finite().min(0).max(1e12).nullable().default(null),
    prepaids: z.number().finite().min(0).max(1e12).nullable().default(null),
    reserves: z.number().finite().min(0).max(1e12).nullable().default(null),
  })
  .strict();
export type ReportContext = z.infer<typeof ContextSchema>;
export const ReportSchema = z
  .object({
    id: z.string().uuid(),
    calculation: CalculationSchema,
    context: ContextSchema,
  })
  .strict();
