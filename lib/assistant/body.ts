import { AssistantFailure } from "./store";
export async function assistantBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new AssistantFailure("Request body required", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 25000) {
        await reader.cancel();
        throw new AssistantFailure("Request is too large", 413);
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
