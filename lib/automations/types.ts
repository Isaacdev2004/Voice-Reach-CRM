export type WorkflowNodeKind = "trigger" | "action" | "delay" | "decision";

export type WorkflowStatus = "draft" | "active" | "paused";

export type DecisionBranch = {
  title: string;
  description: string;
};

export type WorkflowNode = {
  id: string;
  kind: WorkflowNodeKind;
  title: string;
  description: string;
  meta?: string;
  decision?: {
    yes: DecisionBranch;
    no: DecisionBranch;
  };
};

export type AutomationWorkflow = {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  updatedAt: string;
};
