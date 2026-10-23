import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { deleteDotloopConnection, getDotloopConnection, isDotloopConfigured } from "@/lib/integrations/dotloop";

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const connection = await getDotloopConnection(ownerId);
  return apiOk({
    configured: isDotloopConfigured(),
    connected: Boolean(connection),
    accountLabel: connection?.account_label ?? null,
    lastUpdated: connection?.updated_at ?? null,
  });
});

export const DELETE = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const { error } = await deleteDotloopConnection(ownerId);
  if (error) return apiError(error.message, { status: 500 });
  await writeAuditLog({
    ownerId,
    action: "DOTLOOP_DISCONNECTED",
    entityType: "integration",
    entityId: ownerId,
    metadata: {},
  }).catch(() => undefined);
  return apiOk({ connected: false });
});
