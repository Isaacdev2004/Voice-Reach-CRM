import type { Recurrence } from "@/lib/calendar/google";
import { taskMode, taskContext } from "./server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type ContactTaskInsert = {
  owner_id: string;
  contact_id: string;
  title: string;
  due_at?: string | null;
  reminder_at?: string | null;
  notes?: string | null;
  recurrence?: Recurrence;
};

export async function insertContactTask(row: ContactTaskInsert) {
  const payload = {
    owner_id: row.owner_id,
    contact_id: row.contact_id,
    title: row.title,
    due_at: row.due_at ?? null,
    reminder_at: row.reminder_at ?? row.due_at ?? null,
    notes: row.notes ?? null,
    recurrence: row.recurrence ?? "none",
    ...((await taskMode(row.owner_id))
      ? { workspace: { timezone: (await taskContext(row.owner_id)).timezone } }
      : {}),
  };

  let result = await supabaseAdmin
    .from("contact_tasks")
    .insert(payload)
    .select("*, contacts(id, first_name, last_name, phone)")
    .single();

  if (
    result.error &&
    payload.recurrence === "none" &&
    ["42703", "PGRST204"].includes(result.error.code) &&
    /recurrence/.test(result.error.message)
  ) {
    const { recurrence: _r, ...withoutRecurrence } = payload;
    result = await supabaseAdmin
      .from("contact_tasks")
      .insert(withoutRecurrence)
      .select("*, contacts(id, first_name, last_name, phone)")
      .single();
  }

  if (result.error?.message?.includes("contact_tasks")) {
    throw new Error(
      "Tasks are temporarily unavailable. Please retry or contact support.",
    );
  }

  return result;
}
