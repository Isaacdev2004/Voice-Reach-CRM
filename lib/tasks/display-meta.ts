export type TaskPriority = "high" | "medium" | "low" | "unspecified";

export type TaskCategory = {
  label: string;
  className: string;
};

const CATEGORIES: { pattern: RegExp; category: TaskCategory }[] = [
  {
    pattern: /compliance|deep dive|legal/i,
    category: {
      label: "Compliance",
      className: "bg-violet-100 text-violet-900",
    },
  },
  {
    pattern: /go live|setup|launch|finalize/i,
    category: { label: "Setup", className: "bg-sky-100 text-sky-900" },
  },
  {
    pattern: /test|rvm|sms|messaging/i,
    category: {
      label: "Testing",
      className: "bg-sage-light text-emerald-muted",
    },
  },
  {
    pattern: /listing|property|showing/i,
    category: { label: "Listings", className: "bg-bronze-light text-bronze" },
  },
  {
    pattern: /client|referral|anniversary/i,
    category: {
      label: "Clients",
      className: "bg-rose-gold/15 text-rose-gold-deep",
    },
  },
  {
    pattern: /follow|receipt|call back|callback/i,
    category: { label: "Follow-up", className: "bg-amber-100 text-amber-900" },
  },
  {
    pattern: /email|message/i,
    category: {
      label: "Messaging",
      className: "bg-sage-light/80 text-emerald-muted",
    },
  },
];

export function taskCategory(
  title: string,
  notes?: string | null,
): TaskCategory {
  const haystack = `${title} ${notes ?? ""}`;
  for (const { pattern, category } of CATEGORIES) {
    if (pattern.test(haystack)) return category;
  }
  return { label: "General", className: "bg-champagne text-taupe" };
}

export function taskPriority(task: {
  title: string;
  due_at?: string | null;
  completed?: boolean;
  priority?: string | null;
}): TaskPriority {
  if (task.priority === "high" || task.priority === "low") return task.priority;
  if (task.priority === "normal" || task.priority === "medium") return "medium";
  return "unspecified";
}

export function priorityLabel(p: TaskPriority): string {
  if (p === "unspecified") return "Unspecified";
  if (p === "high") return "High";
  if (p === "medium") return "Medium";
  return "Low";
}

export function priorityIcon(p: TaskPriority): string {
  if (p === "unspecified") return "horizontal_rule";
  if (p === "high") return "arrow_upward";
  if (p === "medium") return "drag_handle";
  return "arrow_downward";
}

export function priorityClass(p: TaskPriority): string {
  if (p === "high") return "text-error";
  if (p === "medium") return "text-amber-700";
  return "text-taupe";
}

export function assigneeLabel(
  contact?: {
    first_name: string;
    last_name?: string | null;
    type?: string | null;
  } | null,
): string {
  if (!contact) return "My Tasks";
  if (contact.type === "Personal Tasks") return "My Tasks";
  const name = `${contact.first_name} ${contact.last_name ?? ""}`.trim();
  if (name === "My Tasks") return "My Tasks";
  return name;
}

export function formatTaskDue(iso?: string | null): string {
  if (!iso) return "No due date";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "No due date";
  }
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isOverdue(due_at?: string | null, completed?: boolean) {
  if (!due_at || completed) return false;
  return new Date(due_at).getTime() < startOfDay().getTime();
}

export function isDueWithinDays(
  due_at: string | null | undefined,
  days: number,
  from = new Date(),
) {
  if (!due_at) return false;
  const due = new Date(due_at);
  const end = new Date(from);
  end.setDate(end.getDate() + days);
  return due >= startOfDay(from) && due <= end;
}
