"use client";

import { safeFetch } from "@/lib/api-response";
import { isUuid } from "@/lib/contacts/is-uuid";
import { useCallback, useEffect, useState } from "react";

export type ContactTask = {
  id: string;
  contact_id: string;
  title: string;
  due_at: string | null;
  reminder_at: string | null;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
  calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
};

export function useContactTasks(contactId: string | undefined) {
  const [tasks, setTasks] = useState<ContactTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = Boolean(contactId && isUuid(contactId));

  const refresh = useCallback(async () => {
    if (!enabled || !contactId) {
      setTasks([]);
      return;
    }
    setLoading(true);
    setError(null);
    const envelope = await safeFetch<{ tasks: ContactTask[] }>(`/api/contacts/${contactId}/tasks`);
    setLoading(false);
    if (envelope.success) setTasks(envelope.data.tasks);
    else {
      setError(envelope.error);
      setTasks([]);
    }
  }, [contactId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createTask = async (input: {
    title: string;
    dueAt?: string | null;
    reminderAt?: string | null;
    notes?: string | null;
    recurrence?: string;
    addToCalendar?: boolean;
  }) => {
    if (!contactId) throw new Error("No contact");
    const envelope = await safeFetch<{ task: ContactTask }>(`/api/contacts/${contactId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!envelope.success) throw new Error(envelope.error);
    await refresh();
    return envelope.data.task;
  };

  const updateTask = async (
    taskId: string,
    input: Partial<{
      title: string;
      dueAt: string | null;
      reminderAt: string | null;
      notes: string | null;
      completed: boolean;
    }>,
  ) => {
    if (!contactId) throw new Error("No contact");
    const envelope = await safeFetch<{ task: ContactTask }>(
      `/api/contacts/${contactId}/tasks/${taskId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    if (!envelope.success) throw new Error(envelope.error);
    await refresh();
    return envelope.data.task;
  };

  const deleteTask = async (taskId: string) => {
    if (!contactId) throw new Error("No contact");
    const envelope = await safeFetch<{ deleted: boolean }>(
      `/api/contacts/${contactId}/tasks/${taskId}`,
      { method: "DELETE" },
    );
    if (!envelope.success) throw new Error(envelope.error);
    await refresh();
  };

  return { tasks, loading, error, enabled, refresh, createTask, updateTask, deleteTask };
}
