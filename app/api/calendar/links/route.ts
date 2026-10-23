import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  calendarLinksEnabled,
  hashLinkToken,
  newLinkToken,
} from "@/lib/calendar/links";
import { CalendarPreferencesSchema } from "@/lib/calendar/preferences";
import { z } from "zod";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  if (!calendarLinksEnabled()) return apiOk({ enabled: false, links: [] });
  const r = await supabaseAdmin
    .from("calendar_share_links")
    .select("id, kind, active, created_at")
    .eq("owner_id", owner)
    .order("created_at", { ascending: false });
  if (r.error)
    return apiError("Sharing links are unavailable.", { status: 503 });
  return apiOk({ enabled: true, links: r.data });
});
export const POST = withApiHandler(async (req: Request) => {
  const owner = await requireUserId();
  if (!calendarLinksEnabled())
    return apiError("Calendar sharing requires staging configuration.", {
      status: 503,
    });
  const b = z
    .object({
      kind: z.enum(["feed", "booking"]),
      preferences: CalendarPreferencesSchema,
      title: z.string().trim().min(1).max(100).default("Client appointment"),
      contactId: z.string().uuid().nullable().optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!b.success) return apiError("Check the link settings.", { status: 400 });
  if (b.data.contactId) {
    const c = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("owner_id", owner)
      .eq("id", b.data.contactId)
      .maybeSingle();
    if (c.error || !c.data)
      return apiError("Contact not found.", { status: 404 });
  }
  const token = newLinkToken();
  const r = await supabaseAdmin
    .from("calendar_share_links")
    .insert({
      owner_id: owner,
      kind: b.data.kind,
      token_hash: hashLinkToken(token),
      config: {
        ...b.data.preferences,
        title: b.data.title,
        contactId: b.data.contactId ?? null,
      },
    })
    .select("id")
    .single();
  if (r.error)
    return apiError("Sharing link could not be created.", { status: 503 });
  return apiOk(
    {
      id: r.data.id,
      path:
        b.data.kind === "feed"
          ? `/api/calendar/feed/${token}`
          : `/book/${token}`,
      warning:
        "This private link grants access to its holder. Copy it now; revoke it to stop access.",
    },
    { status: 201 },
  );
});
export const DELETE = withApiHandler(async (req: Request) => {
  const owner = await requireUserId();
  const id = new URL(req.url).searchParams.get("id");
  if (!z.string().uuid().safeParse(id).success)
    return apiError("Link not found.", { status: 404 });
  const r = await supabaseAdmin
    .from("calendar_share_links")
    .update({ active: false })
    .eq("owner_id", owner)
    .eq("id", id!)
    .select("id");
  if (r.error || !r.data?.length)
    return apiError("Link could not be revoked.", { status: 503 });
  return apiOk({ revoked: true });
});
