import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { isUuid } from "@/lib/contacts/is-uuid";
import { readContactActivity } from "@/lib/activity/read-model";
export const GET = withApiHandler<{
  params: Promise<{
    id: string;
  }>;
}>(async (req, ctx) => {
  const owner = await requireUserId();
  const { id } = await ctx.params;
  if (!isUuid(id)) return apiError("Contact not found.", { status: 404 });
  const cursor = new URL(req.url).searchParams.get("cursor");
  if (cursor && cursor.length > 300)
    return apiError("Invalid activity page.", { status: 400 });
  try {
    return apiOk(await readContactActivity(owner, id, cursor));
  } catch (e) {
    const missing = e instanceof Error && e.message === "NOT_FOUND";
    return apiError(
      missing
        ? "Contact not found."
        : "Contact activity could not be loaded. Refresh to try again.",
      { status: missing ? 404 : 503 },
    );
  }
});
