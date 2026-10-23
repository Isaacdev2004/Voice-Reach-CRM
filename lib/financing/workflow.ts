import type { Client } from "./reports";
/** Search only the already authenticated owner snapshot; never introduce sample clients. */
export function matchingClients(clients: Client[], query: string) {
  const q = query.trim().toLowerCase(),
    phone = /^[+\d\s().-]+$/.test(q) ? q.replace(/\D/g, "") : "";
  return clients.filter(
    (c) =>
      [c.first_name, c.last_name, c.email, c.phone]
        .join(" ")
        .toLowerCase()
        .includes(q) ||
      (!!phone &&
        String(c.phone ?? "")
          .replace(/\D/g, "")
          .includes(phone)),
  );
}
export function financingLinks(contactId: string) {
  const id = encodeURIComponent(contactId);
  return {
    profile: `/dashboard/contacts/${id}`,
    property: `/dashboard/properties?contactId=${id}`,
    calendar: `/dashboard/calendar?new=event&contactId=${id}`,
    campaigns: "/dashboard/campaigns",
  };
}
