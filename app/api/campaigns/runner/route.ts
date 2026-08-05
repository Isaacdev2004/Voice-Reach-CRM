import { apiError, apiSuccess, withApiHandler } from "@/lib/api-response";
import { runInactiveLeadScan } from "@/lib/automations/inactive-leads";
import { runDueStepRuns } from "@/lib/campaigns/engine";
import { auth } from "@clerk/nextjs/server";

/**
 * Trigger the campaign step runner.
 * - With Clerk session: runs for the signed-in user
 * - With X-Cron-Secret header matching CAMPAIGN_RUNNER_SECRET: runs across all users
 */
async function handle(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret");
  const envSecret = process.env.CAMPAIGN_RUNNER_SECRET;
  const vercelCron = process.env.CRON_SECRET
    ? request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
    : false;

  if (vercelCron || (cronSecret && envSecret && cronSecret === envSecret)) {
    const inactive = await runInactiveLeadScan({ limit: 100 });
    const result = await runDueStepRuns({ limit: 100 });
    return apiSuccess({ ...result, inactive });
  }

  const { userId } = await auth();
  if (!userId) {
    return apiError("Unauthorized", { status: 401, code: "unauthorized" });
  }

  const inactive = await runInactiveLeadScan({ ownerId: userId, limit: 50 });
  const result = await runDueStepRuns({ ownerId: userId, limit: 50 });
  return apiSuccess({ ...result, inactive });
}

export const POST = withApiHandler(handle);
export const GET = withApiHandler(handle);
