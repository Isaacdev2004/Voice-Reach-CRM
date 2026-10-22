/** A database failure must never be interpreted as unused messaging quota. */
export function verifiedUsageCount(count: number | null, error: unknown): number {
  if (error || count === null || !Number.isSafeInteger(count) || count < 0) {
    throw new Error("Messaging usage is unavailable; sending is paused until usage can be verified.");
  }
  return count;
}
