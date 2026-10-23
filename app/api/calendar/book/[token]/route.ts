import {
  resolveShareLink,
  hashLinkToken,
  newLinkToken,
} from "@/lib/calendar/links";
import { bookingSlots } from "@/lib/calendar/booking";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";
type Context = {
  params: Promise<{
    token: string;
  }>;
};
const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
};
const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers });
export async function GET(req: Request, ctx: Context) {
  try {
    const { token } = await ctx.params;
    const link = await resolveShareLink(token, "booking");
    if (!link) return reply({ error: "Booking link unavailable." }, 404);
    const query = new URL(req.url).searchParams;
    if (query.has("id")) {
      const manageToken =
        req.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
      const requestId = query.get("id");
      if (
        !z.string().uuid().safeParse(requestId).success ||
        !/^[-\w]{43}$/.test(manageToken)
      )
        return reply({ error: "Request unavailable." }, 404);
      const r = await supabaseAdmin
        .from("calendar_booking_requests")
        .select("id, status, starts_at, ends_at, guest_name, guest_email")
        .eq("owner_id", link.owner_id)
        .eq("link_id", link.id)
        .eq("id", requestId!)
        .eq("manage_hash", hashLinkToken(manageToken))
        .maybeSingle();
      if (r.error || !r.data)
        return reply({ error: "Request unavailable." }, 404);
      return reply({ request: r.data });
    }
    const date = query.get("date") ?? "";
    return reply({ ...(await bookingSlots(link, date)), requestOnly: true });
  } catch {
    return reply(
      {
        error:
          "Availability cannot be verified. Try another date or contact your agent.",
      },
      503,
    );
  }
}
const input = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  name: z.string().trim().min(1).max(100),
  email: z.string().email().max(254),
  replace: z.string().uuid().optional(),
  manageToken: z
    .string()
    .regex(/^[-\w]{43}$/)
    .optional(),
});
export async function POST(req: Request, ctx: Context) {
  try {
    const { token } = await ctx.params;
    const link = await resolveShareLink(token, "booking");
    if (!link) return reply({ error: "Booking link unavailable." }, 404);
    const parsed = input.safeParse(await req.json());
    if (!parsed.success)
      return reply({ error: "Check the time, name, and email." }, 400);
    const b = parsed.data;
    if (b.replace && !b.manageToken)
      return reply({ error: "A management link is required." }, 403);
    if (b.replace) {
      const old = await supabaseAdmin
        .from("calendar_booking_requests")
        .select("id")
        .eq("owner_id", link.owner_id)
        .eq("link_id", link.id)
        .eq("id", b.replace)
        .eq("manage_hash", hashLinkToken(b.manageToken!))
        .eq("status", "pending")
        .maybeSingle();
      if (old.error || !old.data)
        return reply({ error: "Booking request unavailable." }, 404);
    }
    const date = new Date(b.start).toLocaleDateString("en-CA", {
      timeZone: String(link.config.timezone ?? "America/New_York"),
    });
    const availability = await bookingSlots(link, date, new Date(), b.replace);
    if (!availability.slots.some((s) => s.start === b.start && s.end === b.end))
      return reply(
        { error: "That time is no longer available. Refresh availability." },
        409,
      );
    const manageToken = newLinkToken();
    const saved = await supabaseAdmin.rpc("reserve_calendar_booking", {
      p_link: link.id,
      p_start: b.start,
      p_end: b.end,
      p_name: b.name,
      p_email: b.email,
      p_manage_hash: hashLinkToken(manageToken),
      p_replace: b.replace ?? null,
      p_old_hash: b.manageToken ? hashLinkToken(b.manageToken) : null,
    });
    if (saved.error)
      return reply(
        { error: "That time could not be reserved. Refresh availability." },
        409,
      );
    return reply(
      {
        id: saved.data,
        manageToken,
        status: "pending",
        message:
          "Request received. Your agent must review and confirm the appointment. No invitations or notifications have been sent.",
      },
      201,
    );
  } catch {
    return reply(
      { error: "The booking request could not be saved. Please retry." },
      503,
    );
  }
}
export async function DELETE(req: Request, ctx: Context) {
  try {
    const { token } = await ctx.params;
    const link = await resolveShareLink(token, "booking");
    if (!link) return reply({ error: "Booking link unavailable." }, 404);
    const b = z
      .object({
        id: z.string().uuid(),
        manageToken: z.string().regex(/^[-\w]{43}$/),
      })
      .safeParse(await req.json());
    if (!b.success) return reply({ error: "Check the management link." }, 400);
    const saved = await supabaseAdmin
      .from("calendar_booking_requests")
      .update({ status: "cancelled" })
      .eq("owner_id", link.owner_id)
      .eq("link_id", link.id)
      .eq("id", b.data.id)
      .eq("manage_hash", hashLinkToken(b.data.manageToken))
      .eq("status", "pending")
      .select("id");
    if (saved.error || !saved.data?.length)
      return reply({ error: "Booking request unavailable." }, 404);
    return reply({ cancelled: true });
  } catch {
    return reply({ error: "Cancellation could not be saved." }, 503);
  }
}
