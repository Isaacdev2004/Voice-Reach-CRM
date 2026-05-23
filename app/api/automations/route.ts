import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const NodeSchema = z.object({
  id: z.string(),
  kind: z.enum(["trigger", "action", "delay", "decision"]),
  title: z.string(),
  description: z.string(),
  meta: z.string().optional(),
  decision: z
    .object({
      yes: z.object({ title: z.string(), description: z.string() }),
      no: z.object({ title: z.string(), description: z.string() }),
    })
    .optional(),
});

const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  status: z.enum(["draft", "active", "paused"]),
  nodes: z.array(NodeSchema).min(1),
  updatedAt: z.string(),
});

const PostSchema = z.object({ workflow: WorkflowSchema });

export async function GET() {
  const ownerId = await requireUserId();

  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .select("metadata, created_at")
    .eq("owner_id", ownerId)
    .eq("entity_type", "automation_workflow")
    .eq("action", "AUTOMATION_SAVED")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byId = new Map<string, z.infer<typeof WorkflowSchema>>();
  for (const row of data ?? []) {
    const wf = (row.metadata as { workflow?: z.infer<typeof WorkflowSchema> })?.workflow;
    if (wf?.id && !byId.has(wf.id)) byId.set(wf.id, wf);
  }

  return NextResponse.json({ workflows: Array.from(byId.values()) });
}

export async function POST(request: Request) {
  const ownerId = await requireUserId();
  const { workflow } = PostSchema.parse(await request.json());

  const saved = { ...workflow, updatedAt: new Date().toISOString() };

  await writeAuditLog({
    ownerId,
    action: "AUTOMATION_SAVED",
    entityType: "automation_workflow",
    entityId: null,
    metadata: { workflow: saved },
  });

  if (saved.status === "active") {
    await writeAuditLog({
      ownerId,
      action: "AUTOMATION_ACTIVATED",
      entityType: "automation_workflow",
      entityId: null,
      metadata: { workflowId: saved.id, nodeCount: saved.nodes.length },
    });
  }

  return NextResponse.json({ ok: true, workflow: saved });
}
