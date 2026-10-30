import { FeatureSymbol } from "./feature-symbol";
import "./campaign-flowchart.css";

/** An illustrative sequence, never a live campaign or a sending control. */
export function CampaignFlowchart() {
  return (
    <figure className="campaign-flow" aria-labelledby="campaign-flow-title">
      <header className="campaign-flow-heading">
        <span className="campaign-flow-eyebrow">The art of staying connected</span>
        <h3 id="campaign-flow-title">A thoughtful next step.<br /><em>Every time.</em></h3>
        <span className="campaign-flow-example">Illustrative workflow</span>
      </header>
      <ol className="campaign-flow-path">
        <li>
          <div className="campaign-flow-node"><span className="campaign-flow-icon"><FeatureSymbol name="contacts" /></span><div><small>01 · A relationship begins</small><strong>New lead in your CRM</strong><p>Start with the details you know.</p></div></div>
          <span className="campaign-flow-connector" aria-hidden="true" />
        </li>
        <li>
          <div className="campaign-flow-node campaign-flow-review"><span className="campaign-flow-icon"><FeatureSymbol name="check" /></span><div><small>02 · Make it personal</small><strong>Review your sequence</strong><p>Choose the message, channels and timing.</p></div></div>
          <span className="campaign-flow-connector" aria-hidden="true" />
        </li>
        <li>
          <span className="campaign-flow-label">03 · Thoughtful touchpoints</span>
          <div className="campaign-flow-channels">
            <div><FeatureSymbol name="email" /><strong>Email</strong><small>A useful introduction</small></div>
            <div><FeatureSymbol name="sms" /><strong>SMS</strong><small>A warm check-in</small></div>
            <div><FeatureSymbol name="voice" /><strong>Voicemail</strong><small>A personal touch</small></div>
          </div>
          <span className="campaign-flow-timing"><FeatureSymbol name="calendar" /> Scheduled steps · your chosen timing</span>
          <span className="campaign-flow-connector" aria-hidden="true" />
        </li>
        <li>
          <div className="campaign-flow-decision"><span className="campaign-flow-diamond" aria-hidden="true">◇</span><div><small>04 · Keep the relationship first</small><strong>Check for a reply</strong></div></div>
          <div className="campaign-flow-branches">
            <div><span className="campaign-flow-branch-label">Reply received</span><strong>Respond personally</strong><p>Pause the sequence when configured.</p></div>
            <div><span className="campaign-flow-branch-label">No reply yet</span><strong>Stay thoughtfully in touch</strong><p>Continue the next step only when permitted.</p></div>
          </div>
        </li>
      </ol>
      <figcaption><FeatureSymbol name="check" /> Review first. Consent required. You stay in control.</figcaption>
    </figure>
  );
}
