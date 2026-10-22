export const AI_ERROR_MESSAGES = {
  invalid_output: "We couldn't create a complete draft. Please try again or adjust your brief.",
  unavailable: "The AI service is temporarily unavailable. Please try again shortly.",
  timeout: "That took longer than expected. Please try generating again.",
  invalid_request: "Please check your task and brief, then try again.",
  contact_unavailable: "This contact isn't available. Choose a contact you can access or draft without contact context.",
} as const;

export class AiGenerationError extends Error {
  constructor(public readonly code: keyof typeof AI_ERROR_MESSAGES, public readonly status = 502) {
    super(AI_ERROR_MESSAGES[code]);
    this.name = "AiGenerationError";
  }
}

/** Deadline covers fetch and response parsing, even when a transport ignores abort. */
export async function withAiDeadline<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new AiGenerationError("timeout", 504));
          controller.abort();
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
