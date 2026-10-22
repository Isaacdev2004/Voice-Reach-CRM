import { z } from "zod";
import type { ApiContact } from "@/lib/hooks/use-contacts";

export const PROPERTY_PREFERENCE_FIELDS = [
  {key:"propertyType",column:"preferred_property_type",label:"Property type",step:null},
  {key:"squareFeet",column:"preferred_sqft",label:"Desired square footage (sq ft)",step:1},
  {key:"beds",column:"preferred_beds",label:"Bedrooms",step:1},
  {key:"baths",column:"preferred_baths",label:"Bathrooms",step:0.5},
  {key:"garageSpaces",column:"preferred_garage_spaces",label:"Garage spaces",step:1},
  {key:"lotSquareFeet",column:"preferred_lot_sqft",label:"Lot size (sq ft)",step:1},
] as const;
export type PropertyPreferenceKey = (typeof PROPERTY_PREFERENCE_FIELDS)[number]["key"];
export type PropertyPreferenceDraft = Record<PropertyPreferenceKey,string>;

export const PropertyPreferencesSchema = z.object({
  propertyType:z.string().trim().max(80).nullable().optional(),
  squareFeet:z.number().positive().max(1e9).nullable().optional(),
  beds:z.number().int().min(0).max(100).nullable().optional(),
  baths:z.number().min(0).max(1000).nullable().optional(),
  garageSpaces:z.number().int().min(0).max(100).nullable().optional(),
  lotSquareFeet:z.number().positive().max(1e12).nullable().optional(),
}).strict();

export function propertyPreferenceDraft(contact?: Pick<ApiContact, (typeof PROPERTY_PREFERENCE_FIELDS)[number]["column"]> | null): PropertyPreferenceDraft {
  return Object.fromEntries(PROPERTY_PREFERENCE_FIELDS.map(field => [field.key,contact?.[field.column] == null ? "" : String(contact[field.column])])) as PropertyPreferenceDraft;
}

/** Empty means unspecified; a real zero for bedrooms/baths/garage is preserved. */
export function parsePropertyPreferences(draft: PropertyPreferenceDraft) {
  const values = Object.fromEntries(PROPERTY_PREFERENCE_FIELDS.map(field => {
    const value = draft[field.key].trim();
    return [field.key,!value ? null : field.key === "propertyType" ? value : Number(value.replace(/,/g,""))];
  }));
  const result = PropertyPreferencesSchema.safeParse(values);
  return result.success ? {data:result.data,error:null} : {data:null,error:"Use non-negative numbers for bedrooms, bathrooms and garage spaces, and positive numbers for square footage and lot size. Bedrooms and garage spaces must be whole numbers."};
}

/** Send only edited fields, so area/budget saves also work before optional columns are installed. */
export function changedPropertyPreferences(contact: ApiContact, draft: PropertyPreferenceDraft) {
  const next = parsePropertyPreferences(draft);
  if (!next.data) return {};
  const previous = parsePropertyPreferences(propertyPreferenceDraft(contact));
  return Object.fromEntries(PROPERTY_PREFERENCE_FIELDS.filter(field => next.data![field.key] !== previous.data?.[field.key]).map(field => [field.key,next.data![field.key]]));
}

export function savedPropertyPreferenceLabels(contact: Pick<ApiContact,(typeof PROPERTY_PREFERENCE_FIELDS)[number]["column"]>): string[] {
  const parsed = parsePropertyPreferences(propertyPreferenceDraft(contact)).data;
  if (!parsed) return [];
  return [parsed.propertyType || null,parsed.squareFeet != null ? `${parsed.squareFeet.toLocaleString()} sq ft` : null,parsed.beds != null ? `${parsed.beds} beds` : null,parsed.baths != null ? `${parsed.baths} baths` : null,parsed.garageSpaces != null ? `${parsed.garageSpaces} garage spaces` : null,parsed.lotSquareFeet != null ? `${parsed.lotSquareFeet.toLocaleString()} sq ft lot` : null].filter((value):value is string => value !== null);
}
