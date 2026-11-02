import { FeatureSymbol } from "./feature-symbol";
import "./campaign-flowchart.css";

const stages = [
  { name: "Capture", icon: "contacts", body: "Add contacts manually or import an authorized CSV.", tool: "CRM & Contacts" },
  { name: "Organize", icon: "notes", body: "Keep stages, notes, tasks and follow-up priorities together.", tool: "Notes · Tasks · Calendar" },
  { name: "Nurture", icon: "campaign", body: "Prepare SMS, email and voicemail sequences for review.", tool: "Campaigns · Reviewed outreach" },
  { name: "Convert", icon: "calendar", body: "Support opportunities with appointments and personal next steps.", tool: "Agent-led follow-through" },
];

/** Refines PR #50's illustrative flowchart; never a live campaign or automatic conversion. */
export function CampaignFlowchart() {
  return <figure className="campaign-flow" aria-labelledby="campaign-flow-title">
    <header className="campaign-flow-heading">
      <span className="campaign-flow-eyebrow">One connected workflow</span>
      <h3 id="campaign-flow-title">From first connection<br /><em>to your next opportunity.</em></h3>
    </header>
    <ol className="campaign-flow-path" aria-label="Capture, organize, nurture and convert">
      {stages.map((stage, index) => <li key={stage.name}>
        <div className="campaign-flow-node">
          <div className="campaign-flow-node-top"><span className="campaign-flow-icon"><FeatureSymbol name={stage.icon} /></span><span className="campaign-flow-number">{String(index + 1).padStart(2, "0")}</span></div>
          <h4>{stage.name}</h4>
          <p>{stage.body}</p>
          <span className="campaign-flow-tool">{stage.tool}</span>
        </div>
        {index < stages.length - 1 && <span className="campaign-flow-connector" aria-hidden="true" />}
      </li>)}
    </ol>
    <div className="campaign-flow-assistant"><span className="campaign-flow-icon"><FeatureSymbol name="ai" /></span><p><strong>MyARI Assistant, alongside you.</strong> Draft messages, summarize supplied notes and plan next steps—where configured and available to your account.</p></div>
    <figcaption>Illustrative journey · Your relationships. Your decisions.</figcaption>
    <p className="campaign-flow-note">Campaign sending requires your review, plan access, provider setup and consent.</p>
  </figure>;
}
