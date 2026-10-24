import { requireUserId } from "@/lib/auth";
import { apiOk, withApiHandler } from "@/lib/api-response";
import { assistantAccess, configuredProvider } from "@/lib/assistant/config";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId(),
    provider = configuredProvider();
  return apiOk({
    enabled: await assistantAccess(owner),
    provider,
    configured:
      provider === "claude"
        ? !!process.env.ANTHROPIC_API_KEY
        : !!process.env.OPENAI_API_KEY,
    model:
      provider === "claude"
        ? process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5"
        : process.env.OPENAI_ASSISTANT_MODEL || "gpt-5-mini",
    externalActionsEnabled:
      process.env.ASSISTANT_APPROVED_SENDS_ENABLED === "true",
    safetyLimits: {
      requestsPerMinute: 5,
      dailyInteractions: Math.min(
        100,
        Number(process.env.ASSISTANT_DAILY_REQUEST_LIMIT) || 30,
      ),
      dailyProviderCalls: Math.min(
        100,
        Number(process.env.ASSISTANT_DAILY_CALL_LIMIT) || 40,
      ),
    },
  });
});
