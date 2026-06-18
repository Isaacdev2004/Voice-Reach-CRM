import { syncCallbackStepToCalendar } from "./sync";

type ContactLite = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
};

export async function syncTaskReminderToCalendar(options: {
  ownerId: string;
  contact: ContactLite;
  taskTitle: string;
  dueAt: string;
  notes?: string | null;
  recurrence?: import("./google").Recurrence;
}) {
  return syncCallbackStepToCalendar({
    ownerId: options.ownerId,
    contact: options.contact,
    stepTitle: options.taskTitle,
    stepDescription: options.notes ?? "Task reminder from VoiceReach",
    scheduledAt: options.dueAt,
    timeLabel: formatTimeLabel(options.dueAt),
    stepType: "task",
    recurrence: options.recurrence,
  });
}

function formatTimeLabel(iso: string): string {
  const date = new Date(iso);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const meridiem = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, "0");
  return `${h}:${m} ${meridiem}`;
}
