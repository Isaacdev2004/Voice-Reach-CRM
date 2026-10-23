import { TemplateSchema, type TaskTemplate } from "./workspace-model";
const make = (
  id: string,
  name: string,
  kind: TaskTemplate["kind"],
  titles: string[],
) =>
  TemplateSchema.parse({
    id,
    name,
    kind,
    steps: titles.map((title, i) => ({
      title,
      notes:
        "Proposed workflow step. Confirm applicability, contractual requirements and deadline before proceeding.",
      days: [0, 0, 1, 3, 7, 14, 21, 28, 30, 31, 35][i] ?? i * 3,
      priority: i < 2 ? "high" : "medium",
      category: kind === "checklist" ? "Follow-up" : "Transaction",
      dependsOn: i > 0 ? [i - 1] : [],
    })),
  });
export const TASK_TEMPLATES: TaskTemplate[] = [
  make("buyer-contract", "Buyer Transaction — Contract to Closing", "buyer", [
    "Offer accepted",
    "Contract executed",
    "Earnest money deposit",
    "Inspection period",
    "Financing and appraisal",
    "Title and closing coordination",
    "Closing disclosure review",
    "Final walkthrough",
    "Closing",
  ]),
  make(
    "listing-contract",
    "Listing Transaction — Preparation to Closing",
    "listing",
    [
      "Listing agreement",
      "Property preparation",
      "Photography",
      "Pricing and marketing",
      "Listing launch",
      "Showings and feedback",
      "Offer review",
      "Contract execution",
      "Inspection and appraisal coordination",
      "Closing preparation",
      "Closing",
    ],
  ),
  make("buyer-nurture", "New Buyer Lead Nurture", "checklist", [
    "Review buyer's recorded goals",
    "Confirm financing preferences",
    "Prepare tailored property search",
    "Arrange a discovery conversation",
    "Review next steps with buyer",
  ]),
  make("seller-nurture", "New Seller Lead Nurture", "checklist", [
    "Review seller's recorded priorities",
    "Confirm property details",
    "Prepare market discussion",
    "Arrange a seller consultation",
    "Confirm agreed follow-up",
  ]),
  make("open-house", "Open House Preparation & Follow-Up", "checklist", [
    "Confirm owner permission and showing details",
    "Prepare property presentation",
    "Review marketing materials and accessibility",
    "Host open house",
    "Record authorized visitor follow-ups",
    "Review feedback with seller",
  ]),
  make("price-reduction", "Price Reduction Strategy", "checklist", [
    "Review current market evidence",
    "Discuss options with seller",
    "Record written pricing authorization",
    "Update approved marketing materials",
    "Review activity and next steps",
  ]),
  make("past-client", "Past Client Relationship Nurture", "checklist", [
    "Review contact preferences and consent",
    "Prepare a personalized check-in",
    "Share relevant local resources",
    "Record contact's next steps",
    "Schedule the next agreed follow-up",
  ]),
  make("listing-launch", "Listing Launch Checklist", "checklist", [
    "Confirm listing agreement and permissions",
    "Verify property facts",
    "Coordinate photography",
    "Review listing and marketing copy",
    "Publish through authorized channels",
    "Review launch response with seller",
  ]),
];
export const TEMPLATE_DATE_NOTICE =
  "All dates are editable proposals, not legal or contractual deadlines. Verify the contract, jurisdiction, holidays, service requirements and each milestone with the appropriate professionals before approving.";
