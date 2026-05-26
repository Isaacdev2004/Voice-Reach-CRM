import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; error: string; code?: string; details?: unknown };
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export function apiSuccess<T>(data: T, init?: { status?: number }) {
  return NextResponse.json<ApiSuccess<T>>(
    { success: true, data },
    { status: init?.status ?? 200 },
  );
}

/**
 * Backward-compatible envelope: keeps legacy keys at top level while
 * also setting `success: true`. Useful for routes whose client code reads
 * properties directly (e.g. `data.contacts`).
 */
export function apiOk<T extends Record<string, unknown>>(payload: T, init?: { status?: number }) {
  return NextResponse.json(
    { success: true, ...payload },
    { status: init?.status ?? 200 },
  );
}

export function apiError(
  message: string,
  init?: { status?: number; code?: string; details?: unknown },
) {
  return NextResponse.json<ApiFailure>(
    {
      success: false,
      error: message,
      ...(init?.code ? { code: init.code } : {}),
      ...(init?.details !== undefined ? { details: init.details } : {}),
    },
    { status: init?.status ?? 500 },
  );
}

/**
 * Wrap a route handler. Always returns a structured JSON envelope —
 * never an empty body / undefined. Fixes "Unexpected end of JSON input".
 */
export function withApiHandler<TContext = unknown>(
  handler: (request: Request, context: TContext) => Promise<NextResponse | Response>,
) {
  return async (request: Request, context: TContext) => {
    try {
      const result = await handler(request, context);
      return result;
    } catch (err) {
      if (err instanceof ZodError) {
        return apiError(err.issues[0]?.message ?? "Invalid request", {
          status: 400,
          code: "validation_error",
          details: err.issues,
        });
      }
      if (err instanceof Error && err.message === "Unauthorized") {
        return apiError("Sign in required", { status: 401, code: "unauthorized" });
      }
      const message = err instanceof Error ? err.message : "Request failed";
      console.error("[api]", message, err);
      return apiError(message, { status: 500 });
    }
  };
}

/** Client-side helper: always parses a JSON envelope safely. */
export async function readApiResponse<T>(res: Response): Promise<ApiEnvelope<T>> {
  const text = await res.text();
  if (!text) {
    return {
      success: false,
      error: `Empty response (status ${res.status})`,
      code: "empty_response",
    };
  }
  try {
    const json = JSON.parse(text);
    if (typeof json === "object" && json !== null && "success" in json) {
      return json as ApiEnvelope<T>;
    }
    if (res.ok) return { success: true, data: json as T };
    return {
      success: false,
      error: (json as { error?: string }).error ?? `Request failed (${res.status})`,
    };
  } catch {
    return {
      success: false,
      error: `Invalid JSON response (status ${res.status})`,
      code: "invalid_json",
    };
  }
}

export async function safeFetch<T>(input: RequestInfo, init?: RequestInit): Promise<ApiEnvelope<T>> {
  try {
    const res = await fetch(input, init);
    return await readApiResponse<T>(res);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
      code: "network_error",
    };
  }
}
