import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  categoriesUsedOnContacts,
  contactMatchesCategory,
  mergeCategoryLists,
  normalizeCategoryName,
} from "@/lib/contacts/categories";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { loadSavedSettings } from "@/lib/billing/settings-store";
import type { UserSettings } from "@/lib/settings/types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";
import { readContactSnapshot } from "@/lib/contacts/read-snapshot";

async function saveCategories(ownerId: string, categories: string[], base: UserSettings) {
  const settings: UserSettings = {
    ...base,
    contactCategories: categories,
    updatedAt: new Date().toISOString(),
  };
  await writeAuditLog({
    ownerId,
    action: "SETTINGS_SAVED",
    entityType: "user_settings",
    metadata: { settings, source: "contact_categories" },
  });
  return settings;
}

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const saved = await loadSavedSettings(ownerId);
  let data;
  try { data = await readContactSnapshot(supabaseAdmin, ownerId); }
  catch { return apiError("Unable to load contact categories. Please retry.", { status: 503 }); }

  const categories = mergeCategoryLists(
    saved?.contactCategories ?? DEFAULT_SETTINGS.contactCategories,
    categoriesUsedOnContacts(data ?? []),
  );

  const counts: Record<string, number> = { all: (data ?? []).length };
  for (const name of categories) {
    const key = name.toLowerCase();
    counts[key] = data.filter(contact => contactMatchesCategory(contact, name)).length;
  }

  return apiOk({ categories, counts });
});

const BodySchema = z.object({
  action: z.enum(["add", "rename", "remove", "replace"]),
  name: z.string().min(1).max(40).optional(),
  from: z.string().min(1).max(40).optional(),
  to: z.string().min(1).max(40).optional(),
  categories: z.array(z.string().min(1).max(40)).max(40).optional(),
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = BodySchema.parse(await request.json());
  const saved = (await loadSavedSettings(ownerId)) ?? DEFAULT_SETTINGS;
  let used;
  try { used = await readContactSnapshot(supabaseAdmin, ownerId); }
  catch { return apiError("Unable to verify contact categories. Please retry.", { status: 503 }); }
  let list = mergeCategoryLists(saved.contactCategories ?? DEFAULT_SETTINGS.contactCategories, categoriesUsedOnContacts(used));

  if (body.action === "replace") {
    list = mergeCategoryLists(body.categories ?? []);
  } else if (body.action === "add") {
    const name = normalizeCategoryName(body.name ?? "");
    if (!name) return apiError("Category name is required.", { status: 400 });
    if (list.some((c) => c.toLowerCase() === name.toLowerCase())) {
      return apiError("That category already exists.", { status: 409, code: "duplicate" });
    }
    list = [...list, name];
  } else if (body.action === "rename") {
    const from = normalizeCategoryName(body.from ?? "");
    const to = normalizeCategoryName(body.to ?? "");
    if (!from || !to) return apiError("Both names are required.", { status: 400 });
    if (!list.some((c) => c.toLowerCase() === from.toLowerCase())) {
      return apiError("Category not found.", { status: 404 });
    }
    if (
      list.some((c) => c.toLowerCase() === to.toLowerCase() && c.toLowerCase() !== from.toLowerCase())
    ) {
      return apiError("That category already exists.", { status: 409, code: "duplicate" });
    }
    list = list.map((c) => (c.toLowerCase() === from.toLowerCase() ? to : c));
    const { error } = await supabaseAdmin
      .from("contacts")
      .update({ category: to, updated_at: new Date().toISOString() })
      .eq("owner_id", ownerId)
      .ilike("category", from.replace(/[\\%_]/g, match => "\\" + match));
    if (error) return apiError("Unable to rename category. Please retry.", { status: 503 });
  } else if (body.action === "remove") {
    const name = normalizeCategoryName(body.name ?? "");
    if (!name) return apiError("Category name is required.", { status: 400 });
    list = list.filter((c) => c.toLowerCase() !== name.toLowerCase());
    const { error } = await supabaseAdmin
      .from("contacts")
      .update({ category: null, updated_at: new Date().toISOString() })
      .eq("owner_id", ownerId)
      .ilike("category", name.replace(/[\\%_]/g, match => "\\" + match));
    if (error) return apiError("Unable to remove category. Please retry.", { status: 503 });
  }

  const settings = await saveCategories(ownerId, list, saved);
  return apiOk({ categories: list, settings });
});
