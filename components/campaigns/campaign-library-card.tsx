"use client";
import { Icon } from "@/components/ui/icon";
import { channelIcon } from "@/lib/campaigns/library-ui";
import {
  campaignStatus,
  durationLabel,
  type LibraryCampaign,
} from "@/lib/campaigns/library-data";
export type Cover = { url: string; tile?: number };
export function CampaignCover({
  cover,
  className = "",
}: {
  cover: Cover;
  className?: string;
}) {
  if (!cover.url)
    return (
      <div
        role="img"
        aria-label="Campaign artwork"
        className={`cl-cover cl-cover-placeholder ${className}`}
      >
        <Icon name="home_work" />
      </div>
    );
  const optimized =
    cover.tile === undefined
      ? cover.url
      : `/_next/image?url=${encodeURIComponent(cover.url)}&w=1920&q=75`;
  return (
    <div
      role="img"
      aria-label="Luxury residential interior"
      className={`cl-cover ${className}`}
    >
      <div
        className={
          cover.tile === undefined ? "cl-cover-upload" : "cl-cover-tile"
        }
        style={{
          backgroundImage: `url("${optimized}")`,
          aspectRatio:
            cover.tile === undefined
              ? undefined
              : cover.url.endsWith("interiors-b.png")
                ? "9 / 8"
                : "1",
          backgroundSize: cover.tile === undefined ? "cover" : "400% 300%",
          backgroundPosition:
            cover.tile === undefined
              ? "center"
              : `${((cover.tile % 4) * 100) / 3}% ${Math.floor(cover.tile / 4) * 50}%`,
        }}
      />
    </div>
  );
}
export function CampaignLibraryCard({
  campaign,
  cover,
  pinned,
  onOpen,
  onPin,
  onPreview,
  isTemplate = false,
  view = "grid",
}: {
  campaign: LibraryCampaign;
  cover: Cover;
  pinned: boolean;
  onOpen: () => void;
  onPin?: () => void;
  onPreview?: () => void;
  isTemplate?: boolean;
  view?: string;
}) {
  const label = isTemplate ? "Template" : campaignStatus(campaign);
  return (
    <article className={`cl-card ${view === "list" ? "cl-card-list" : ""}`}>
      <button
        type="button"
        className="cl-card-open"
        onClick={onOpen}
        aria-label={`${isTemplate ? "Preview" : "Open workspace for"} ${campaign.name}`}
      >
        <div className="cl-card-photo">
          <CampaignCover cover={cover} />
          <span className={`cl-badge cl-status-${campaign.status}`}>
            {label}
          </span>
        </div>
        <div className="cl-card-content">
          <h3>{campaign.name}</h3>
          <p className="cl-card-description">
            {campaign.description ||
              "Your saved outreach sequence, ready to review and refine."}
          </p>
          <div className="cl-channels">
            {campaign.channels.map((ch) => (
              <span key={ch} title={ch} aria-label={ch}>
                <Icon name={channelIcon(ch)} />
              </span>
            ))}
            {!campaign.channels.length ? (
              <span className="cl-muted">No channels configured</span>
            ) : null}
          </div>
          <div className="cl-card-meta">
            <span>
              {isTemplate
                ? "Starter playbook"
                : `${campaign.enrollmentCount.toLocaleString()} contacts`}
            </span>
            <span>
              {durationLabel(campaign.durationMinutes)} · {campaign.stepCount}{" "}
              steps
            </span>
          </div>
          <p className="cl-edited">
            {isTemplate
              ? "Customize before enrolling"
              : `Last edited ${new Date(campaign.updated_at || campaign.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
          </p>
        </div>
      </button>
      {onPreview && (
        <button
          className="cl-button"
          onClick={onPreview}
          aria-label={`Quick preview ${campaign.name}`}
        >
          Quick Preview
        </button>
      )}
      {onPin ? (
        <button
          type="button"
          className={`cl-pin ${pinned ? "is-pinned" : ""}`}
          aria-label={`${pinned ? "Unpin" : "Pin"} ${campaign.name}`}
          aria-pressed={pinned}
          onClick={onPin}
        >
          <Icon name="push_pin" />
        </button>
      ) : null}
    </article>
  );
}
