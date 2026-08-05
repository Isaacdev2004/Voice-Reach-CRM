import { apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { getDotloopConnection, isDotloopConfigured } from "@/lib/integrations/dotloop";

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const dotloop = await getDotloopConnection(ownerId).catch(() => null);
  return apiOk({
    claude: {
      configured: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
      model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5",
    },
    openai: {
      configured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    },
    dotloop: {
      configured: isDotloopConfigured(),
      connected: Boolean(dotloop),
      accountLabel: dotloop?.account_label ?? null,
    },
  });
});
