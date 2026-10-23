/** Defense in depth for accidentally pasted credentials. No credentials are read from CRM configuration. */
export function redactCredentials(value: string) {
  return value.replace(
    /\bsk-ant-[A-Za-z0-9_-]+|\bsk_(?:live|test)_[A-Za-z0-9]+|\bAKIA[A-Z0-9]{16}|\bBearer\s+[A-Za-z0-9._~+\/-]{16,}/g,
    "[credential removed]",
  );
}
