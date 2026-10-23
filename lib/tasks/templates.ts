import { TemplateSchema, type TaskTemplate } from "./workspace-model";
const guidance: Record<string, string> = {
  "Offer accepted":
    "Review the accepted offer with your buyer and confirm the signed agreement and responsible parties. Record actual contract deadlines in the editable dates below.",
  "Contract executed":
    "Confirm all required signatures and distribute the executed agreement through authorized channels. Record the effective date from the agreement.",
  "Earnest money deposit":
    "Verify the contract's deposit amount, recipient and deadline. Confirm receipt with the escrow holder using verified contact details; do not infer payment instructions.",
  "Inspection period":
    "Confirm the contractual inspection window, arrange authorized access, and discuss the licensed inspector's findings with the buyer before the actual deadline.",
  "Financing and appraisal":
    "Confirm the buyer's lender milestones and appraisal status with authorization. Track outstanding conditions and the contract's financing deadlines.",
  "Title and closing coordination":
    "Confirm title/escrow contacts, required documents and outstanding issues with the closing professional. Verify wire instructions independently.",
  "Closing disclosure review":
    "Confirm receipt and review with the buyer and lender. Use the lender's actual timing requirements and closing date, rather than this proposed offset.",
  "Final walkthrough":
    "Arrange authorized access near the actual closing date. Review agreed repairs and property condition with the buyer; record unresolved items.",
  Closing:
    "Confirm the actual settlement appointment and outstanding requirements with the closing professional. Record completion only after confirmation.",
  "Listing agreement":
    "Review the executed listing agreement, owner permissions, pricing authority and important dates before beginning marketing.",
  "Property preparation":
    "Agree a preparation plan with the seller, including access, repairs, staging and vendor responsibilities. Record the approved schedule.",
  Photography:
    "Coordinate approved photography and usage rights. Check that images accurately represent the property and respect owner privacy.",
  "Pricing and marketing":
    "Review current comparable evidence and seller goals. Obtain approval for pricing and the marketing plan before publication.",
  "Listing launch":
    "Verify property facts, required disclosures, permissions and approved pricing before publishing through authorized listing channels.",
  "Showings and feedback":
    "Confirm showing instructions and access permissions. Summarize actual feedback for the seller without inventing buyer interest.",
  "Offer review":
    "Present actual offers promptly and review terms with the seller and appropriate professionals. Record the seller's instructions.",
  "Contract execution":
    "Verify the accepted agreement is fully signed and record its actual effective date, contingencies and deadlines.",
  "Inspection and appraisal coordination":
    "Coordinate authorized access and track inspection/appraisal milestones from the executed agreement. Escalate issues to the appropriate professional.",
  "Closing preparation":
    "Confirm title, settlement documents and seller obligations with the closing professional using the actual closing date.",
  "Review buyer's recorded goals":
    "Review existing contact notes, budget, preferred area and timing. Flag missing preferences to confirm with the buyer instead of assuming them.",
  "Confirm financing preferences":
    "Ask about the buyer's financing plan and preferred lender through an authorized channel. Record only information the buyer elects to share.",
  "Prepare tailored property search":
    "Use confirmed location, budget and optional home preferences to prepare the existing Property Finder search. Review criteria before sharing.",
  "Arrange a discovery conversation":
    "Offer a convenient consultation through the contact's permitted channel. Record an appointment only after the buyer confirms.",
  "Review next steps with buyer":
    "Summarize agreed preferences and actions from the actual conversation. Set a follow-up date agreed with the buyer.",
  "Review seller's recorded priorities":
    "Review the seller's existing goals, timing and communication preferences. Note questions to resolve during consultation.",
  "Confirm property details":
    "Verify the owner's property address and known facts against authorized records. Do not invent valuations, features or condition.",
  "Prepare market discussion":
    "Gather current comparable evidence and label estimates clearly. Prepare questions about the seller's goals and timing.",
  "Arrange a seller consultation":
    "Offer a suitable consultation through an authorized channel and record the confirmed appointment in Calendar.",
  "Confirm agreed follow-up":
    "Document the seller's instructions and next agreed action, including who is responsible and a confirmed follow-up date.",
  "Confirm owner permission and showing details":
    "Confirm written permission, event date, access instructions, safety arrangements and any showing restrictions before advertising.",
  "Prepare property presentation":
    "Check approved property facts, presentation materials and visitor access. Coordinate preparation responsibilities with the owner.",
  "Review marketing materials and accessibility":
    "Review approved event details, photo rights, required disclosures and accessibility information before publishing.",
  "Host open house":
    "Follow the owner's access and safety instructions. Collect visitor information with appropriate notice and channel-specific permission.",
  "Record authorized visitor follow-ups":
    "Review actual visitor notes and recorded permissions. Draft relevant follow-ups for review; do not assume attendance grants messaging consent.",
  "Review feedback with seller":
    "Summarize actual attendance and visitor feedback. Agree the next action and record any pricing or marketing instructions.",
  "Review current market evidence":
    "Review actual comparable listings, recent activity and feedback. Prepare a factual pricing discussion without promising an outcome.",
  "Discuss options with seller":
    "Explain evidence and available pricing strategies. Record the seller's decision without changing listing prices automatically.",
  "Record written pricing authorization":
    "Obtain and retain the seller's actual written approval and effective date before changing advertised pricing.",
  "Update approved marketing materials":
    "Verify written authorization, then update the approved listing and materials through authorized channels. Check consistency afterwards.",
  "Review activity and next steps":
    "Review actual response following the authorized price change and agree the next review date with the seller.",
  "Review contact preferences and consent":
    "Review the past client's existing communication preferences and permissions before planning any outreach.",
  "Prepare a personalized check-in":
    "Draft a relevant check-in based on actual relationship history. Avoid assuming a move, anniversary or need that is not recorded.",
  "Share relevant local resources":
    "Choose accurate, current resources relevant to the client's expressed interests. Review permission and channel before sending manually.",
  "Record contact's next steps":
    "Save the client's actual response and any agreed actions. Do not record suggested actions as client commitments.",
  "Schedule the next agreed follow-up":
    "Set a follow-up based on the client's expressed preference and your actual calendar. Adjust this proposed date before approval.",
  "Confirm listing agreement and permissions":
    "Verify the executed listing agreement, owner approvals and marketing permissions before planning launch.",
  "Verify property facts":
    "Confirm address, features, pricing and required disclosures against authorized source records. Resolve discrepancies before publication.",
  "Coordinate photography":
    "Arrange approved photography, access and image licensing. Verify the final images reflect the actual property.",
  "Review listing and marketing copy":
    "Check every property fact, image, disclosure and claim with the seller's approved information before publication.",
  "Publish through authorized channels":
    "Confirm approvals and launch timing before manually publishing through existing authorized channels. This task does not publish automatically.",
  "Review launch response with seller":
    "Review actual listing activity and feedback after launch. Agree next steps without fabricating views, inquiries or performance.",
};
const offsets: Record<string, number[]> = {
  "buyer-contract": [0, 0, 1, 3, 7, 10, 21, 28, 30],
  "listing-contract": [0, 2, 4, 3, 7, 10, 14, 15, 18, 28, 30],
  "buyer-nurture": [0, 1, 2, 3, 7],
  "seller-nurture": [0, 1, 2, 3, 7],
  "open-house": [-7, -5, -3, 0, 1, 2],
  "price-reduction": [-2, -1, 0, 0, 7],
  "past-client": [-1, 0, 1, 2, 7],
  "listing-launch": [-7, -5, -4, -2, 0, 2],
};
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
      notes: guidance[title],
      days:
        id === "buyer-contract" && i >= 6
          ? [-5, -1, 0][i - 6]
          : id === "listing-contract" && i >= 9
            ? [-7, 0][i - 9]
            : offsets[id][i],
      anchor:
        (id === "buyer-contract" && i >= 6) ||
        (id === "listing-contract" && i >= 9)
          ? "closing"
          : "start",
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
