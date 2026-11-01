import { z } from "zod";
export const MortgagePdfPreferencesSchema = z
  .object({
    template: z.enum(["myari", "agent", "cobranded"]).default("myari"),
    imagery: z.boolean().default(true),
  })
  .default({ template: "myari", imagery: true });
export type MortgagePdfPreferences = z.infer<
  typeof MortgagePdfPreferencesSchema
>;
