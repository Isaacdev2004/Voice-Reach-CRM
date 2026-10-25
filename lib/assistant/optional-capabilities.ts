import { AssistantFailure } from "./store";
import type { AssistantAction } from "./schema";

// Opt in only after schema and hosted acceptance. These do not grant CRM rights.
const groups = {
  partners: { flag: "ASSISTANT_PARTNERS_VERIFIED", label: "Preferred partner lookup and partner branding" },
  transactions: { flag: "ASSISTANT_TRANSACTIONS_VERIFIED", label: "Transaction milestones and checklist assignment" },
  inbound: { flag: "ASSISTANT_INBOUND_VERIFIED", label: "Verified inbound follow-up insights" },
} as const;
type Group = keyof typeof groups;
const tools: Record<string, Group> = {
  read_preferred_partners: "partners",
  read_transaction_milestones: "transactions",
  prepare_checklist: "transactions",
  read_unanswered_replies: "inbound",
};
export function requireOptionalCapability(group: Group) {
  const capability = groups[group];
  if (process.env[capability.flag] !== "true")
    throw new AssistantFailure(`${capability.label} is unavailable in this beta until its database dependencies and hosted acceptance are verified.`, 503);
}
export function optionalToolAvailable(name: string) {
  return !tools[name] || process.env[groups[tools[name]].flag] === "true";
}
export function requireOptionalTool(name: string) {
  if (tools[name]) requireOptionalCapability(tools[name]);
}
export function requireOptionalAction(action: AssistantAction) {
  if (action.kind === "checklist") requireOptionalCapability("transactions");
  if (action.kind === "flyer" && action.partnerIds.length)
    requireOptionalCapability("partners");
}
