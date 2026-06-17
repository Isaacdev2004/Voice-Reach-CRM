import { z } from "zod";

export const ConsentSchema = z.enum(["Yes", "No", "Unknown"]);

export const CreateContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional().default(""),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
  type: z.string().optional().default("Cold Lead"),
  source: z.string().optional().default("Manual entry"),
  dnc: z.boolean().optional().default(false),
  notes: z.string().optional().default(""),
  consent: ConsentSchema.optional().default("Unknown"),
  consentDate: z.string().optional().default(""),
  consentSource: z.string().optional().default(""),
  proof: z.string().optional().default(""),
});

export const PatchContactSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  phone: z.string().min(7).optional(),
  email: z.string().email().optional().or(z.literal("")),
  type: z.string().optional(),
  source: z.string().optional(),
  dnc: z.boolean().optional(),
  notes: z.string().optional(),
  consent: ConsentSchema.optional(),
  consentDate: z.string().optional(),
  consentSource: z.string().optional(),
  proof: z.string().optional(),
});

export function filterContactsByQuery<
  T extends {
    first_name: string;
    last_name?: string | null;
    phone?: string;
    email?: string | null;
    source?: string | null;
    type?: string | null;
    notes?: string | null;
  },
>(contacts: T[], q: string): T[] {
  const term = q.trim().toLowerCase();
  if (!term) return contacts;
  return contacts.filter((c) => {
    const name = `${c.first_name} ${c.last_name ?? ""}`.toLowerCase();
    return (
      name.includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phone?.includes(q.trim()) ||
      c.source?.toLowerCase().includes(term) ||
      c.type?.toLowerCase().includes(term) ||
      c.notes?.toLowerCase().includes(term)
    );
  });
}
