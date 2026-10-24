import { meterExisting } from "@/lib/billing/ai/endpoint";
import { apiSuccess, apiError } from "@/lib/api-response";
import {
  tasksHandler,
  taskContext,
  readTasks,
  TaskFailure,
} from "@/lib/tasks/server";
import { proposeTasks } from "@/lib/tasks/ai";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
const Body = z.object({
  source: z.string().trim().min(1).max(15000),
  action: z
    .enum([
      "Create",
      "Summarize",
      "Prioritize",
      "Break down",
      "Suggest follow-ups",
      "From Note",
      "Transaction update",
    ])
    .default("Create"),
  noteId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
});
const originalPOST = tasksHandler(async (req, owner) => {
  const b = Body.parse(await req.json()),
    c = await taskContext(owner);
  if (b.contactId && !c.contacts.some((c) => c.id === b.contactId))
    throw new TaskFailure("NOT_FOUND", 404);
  let source = b.source;
  if (b.noteId) {
    const n = await supabaseAdmin
      .from("contact_notes")
      .select("body")
      .eq("owner_id", owner)
      .eq("id", b.noteId)
      .maybeSingle();
    if (n.error) throw n.error;
    if (!n.data) throw new TaskFailure("NOT_FOUND", 404);
    source = String(n.data.body ?? "").slice(0, 15000);
  }
  const tasks = await readTasks(owner);
  try {
    return apiSuccess(
      await proposeTasks(
        source,
        b.action,
        c.contacts
          .filter((x) => !b.contactId || x.id === b.contactId)
          .slice(0, 200)
          .map((c) => ({
            id: c.id,
            name: [c.first_name, c.last_name].filter(Boolean).join(" "),
          })),
        c.timezone,
        new Date().toISOString(),
        JSON.stringify(
          tasks.map((t) => ({
            id: t.id,
            title: t.title,
            dueAt: t.due_at,
            completed: t.completed,
          })),
        ).slice(0, 12000),
      ),
    );
  } catch (e) {
    return apiError(
      e instanceof Error && e.message === "UNCONFIGURED"
        ? "AI assistance is not connected in this workspace. You can still create and edit tasks manually."
        : "AI could not prepare a reliable draft. Your text is still here; please retry or create tasks manually.",
      { status: 503, code: "ai_unavailable" },
    );
  }
});

export const POST = meterExisting(originalPOST);
