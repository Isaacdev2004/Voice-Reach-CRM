import { savedPropertyPreferenceLabels, PROPERTY_PREFERENCE_FIELDS } from "./preferences";
import type { ApiContact } from "@/lib/hooks/use-contacts";

export function propertyBudget(raw: string): { value: number | null; error: string | null } {
  if (!raw.trim()) return {value:null,error:null};
  const value = Number(raw.replace(/,/g,""));
  if (!Number.isFinite(value) || value <= 0) return {value:null,error:"Enter a maximum price greater than zero, or leave it blank."};
  return {value,error:null};
}

/** Only existing saved contact fields; never infer beds, home type, ranges or listing data. */
export function savedPropertyCriteria(contact: Pick<ApiContact, "preferred_area" | "budget" | (typeof PROPERTY_PREFERENCE_FIELDS)[number]["column"]>) {
  const area = contact.preferred_area?.trim() || "";
  const parsed = propertyBudget(contact.budget == null ? "" : String(contact.budget));
  const preferences = savedPropertyPreferenceLabels(contact);
  return {area,budget:parsed.error ? null : parsed.value,preferences,hasCriteria:Boolean(area || parsed.value || preferences.length)};
}

/** A remembered ID is useful only when it still resolves inside the verified owned snapshot. */
export function restoredPropertyClient(storage: Pick<Storage,"getItem">, ownerId: string, contacts: ApiContact[]): ApiContact | null {
  const id = storage.getItem(`myari:property-client:v1:${ownerId}`);
  return contacts.find(contact => contact.id === id && (contact as ApiContact & {owner_id?:string}).owner_id === ownerId) ?? null;
}

export function rememberPropertyClient(storage: Pick<Storage,"setItem">, ownerId: string, contactId: string) {
  storage.setItem(`myari:property-client:v1:${ownerId}`,contactId);
}
