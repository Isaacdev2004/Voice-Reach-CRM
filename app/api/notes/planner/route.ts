import { apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { ownedRows } from "@/lib/delivery/owned-rows";
import { notesFailure } from "@/lib/notes/server";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  try {
    return apiOk({
      tasks: await ownedRows("contact_tasks", "*", owner),
    });
  } catch {
    return notesFailure();
  }
});
