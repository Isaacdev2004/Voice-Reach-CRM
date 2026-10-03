import { LEGAL_ENTITY, LEGAL_ENTITY_DBA } from "./company";

/** Single authoritative revision date for all public legal policies. */
export const LEGAL_LAST_UPDATED = "October 2, 2026";

export function legalPageSubtitle() {
  return `Effective ${LEGAL_LAST_UPDATED} · ${LEGAL_ENTITY_DBA}`;
}

export const LEGAL_POLICY_META = {
  entity: LEGAL_ENTITY,
  entityDba: LEGAL_ENTITY_DBA,
  lastUpdated: LEGAL_LAST_UPDATED,
  effectiveDate: LEGAL_LAST_UPDATED,
} as const;
