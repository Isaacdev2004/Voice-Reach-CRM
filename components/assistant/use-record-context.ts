"use client";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { publishPageRecord } from "@/lib/assistant/page-record";
export function useAssistantRecord(record: Record<string, string | undefined>) {
  const { user } = useUser(),
    key = JSON.stringify(record);
  useEffect(() => {
    if (!user?.id) return;
    const values = Object.fromEntries(
      Object.entries(
        JSON.parse(key) as Record<string, string | undefined>,
      ).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
    return publishPageRecord(user.id, window.location.pathname, values);
  }, [user?.id, key]);
}
