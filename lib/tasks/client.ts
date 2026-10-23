import { readApiResponse } from "@/lib/api-response";
export async function taskRequest<T>(
  url: string,
  method = "GET",
  body?: unknown,
  expectedOwner?: string,
): Promise<T> {
  let r: Response;
  try {
    r = await fetch(url, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(35000),
      headers: {
        "Content-Type": "application/json",
        ...(expectedOwner ? { "X-MyARI-Owner": expectedOwner } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw Error(
      "The connection took too long or was interrupted. Your draft is still here; please retry.",
    );
  }
  const e = await readApiResponse<T>(r);
  if (!r.ok || !e.success) {
    if (
      !e.success &&
      e.code &&
      [
        "NOT_FOUND",
        "CONFLICT",
        "BLOCKED",
        "CYCLE",
        "UPGRADE",
        "ASSIGNEE",
        "APPROVAL",
        "INVALID",
        "ai_unconfigured",
        "ai_unavailable",
      ].includes(e.code)
    )
      throw Error(e.error);
    throw Error(
      "This action could not be completed. Your draft is still here; please retry.",
    );
  }
  return e.data;
}
