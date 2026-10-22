/** Only paths produced by the owner-scoped attachment upload endpoint are allowed. */
export function assertAttachmentOwnership(ownerId: string, storagePath: string): void {
  const prefix = `${ownerId}/attachments/`;
  const file = storagePath.slice(prefix.length);
  if (!ownerId || !storagePath.startsWith(prefix) || !file ||
      file === "." || file === ".." || /[/\\%\x00-\x1f]/.test(file)) {
    throw new Error("Attachment does not belong to this account.");
  }
}
