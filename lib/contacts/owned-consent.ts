/** A historical malformed child row must never disclose another account's consent evidence. */
export function ownedConsentRecords<T extends { owner_id?: string; contact_id?: string }>(records: T[], ownerId: string, contactId: string): T[] {
  return records.filter(record => record.owner_id === ownerId && record.contact_id === contactId);
}
