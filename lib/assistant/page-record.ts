// In-memory UI record references only. Not trusted CRM data; every ID is authorized again on the server.
const selected = new Map<
  string,
  { path: string; record: Record<string, string>; token: symbol }
>();
export function publishPageRecord(
  owner: string,
  path: string,
  record: Record<string, string>,
) {
  const token = Symbol();
  selected.set(owner, { path, record, token });
  return () => {
    if (selected.get(owner)?.token === token) selected.delete(owner);
  };
}
export function selectedPageRecord(owner: string, path: string) {
  const current = selected.get(owner);
  return current?.path === path ? current.record : {};
}
