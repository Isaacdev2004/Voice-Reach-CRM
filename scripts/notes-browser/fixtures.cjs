// Synthetic local HTTP backend for component interaction tests, never live CRM data.
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const meta = (m = {}) => ({
  category: "General",
  tags: [],
  contactIds: [],
  propertyContactIds: [],
  pinned: false,
  isTemplate: false,
  originalTranscript: "",
  transcriptSource: "",
  priorityIds: [],
  ...m,
});
module.exports = function () {
  const contact = {
    id: id(2),
    first_name: "Jordan",
    last_name: "Lee",
    email: "jordan@example.test",
    phone: "+15555550123",
    property_address: "123 Example Lane",
    preferred_area: "Winter Park",
  };
  const titles = [
    "Listing presentation prep",
    "Follow up after showing",
    "Quarterly goals and action plan",
    "Market update to prepare",
    "Client consultation notes",
  ];
  const notes = titles.map((title, i) => ({
    id: id(20 + i),
    owner_id: "owner_a",
    client_key: id(100 + i),
    revision: 1,
    title,
    kind: i === 2 ? "goal" : "note",
    body:
      i === 0
        ? "## Talking points\n- Review verified property details\n- Discuss marketing approach\n\n## Next steps\n- [ ] Prepare presentation\n- [ ] Review client questions\n\nClient requested a garden."
        : "## Context\nRecord verified information here.\n\n## Next steps\n- [ ] Review the next step",
    contact_id: id(2),
    metadata: meta({
      category: i === 2 ? "Goals" : i === 3 ? "Strategy" : "Clients",
      tags: i === 0 ? ["listing", "meeting"] : ["follow-up"],
      contactIds: [id(2)],
      propertyContactIds: i === 0 ? [id(2)] : [],
      pinned: i === 0,
    }),
    created_at: "2026-10-22T09:42:00.000Z",
    updated_at: "2026-10-22T09:42:00.000Z",
  }));
  const state = {
    notes,
    versions: [],
    tasks: [],
    requests: [],
    failSave: false,
    conflict: false,
    basic: false,
    failLoad: false,
    failCalendar: false,
  };
  const originalNotes = structuredClone(notes);
  return {
    state,
    reset() {
      state.notes = structuredClone(originalNotes);
      state.tasks = [];
      state.versions = [];
      state.requests = [];
      state.failSave = false;
      state.conflict = false;
      state.basic = false;
      state.failLoad = false;
      state.failCalendar = false;
    },
    async handle(req, res, url) {
      if (!url.pathname.startsWith("/api/")) return false;
      const owner = req.headers["x-review-owner"] || "owner_a",
        path = url.pathname,
        method = req.method;
      let body = null;
      if (method === "POST" || method === "PATCH") {
        let raw = "";
        for await (const c of req) raw += c;
        try {
          body = JSON.parse(raw);
        } catch {}
      }
      state.requests.push({ owner, path, method, body });
      function send(data, status = 200) {
        res.statusCode = status;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ success: status < 400, ...data }));
        return true;
      }
      const basicNote = (n) => ({
        ...n,
        client_key: n.id,
        revision: 0,
        metadata: meta({
          category:
            n.kind === "goal"
              ? "Goals"
              : n.kind === "strategy"
                ? "Strategy"
                : "General",
          contactIds: n.contact_id ? [n.contact_id] : [],
          propertyContactIds: n.contact_id === contact.id ? [contact.id] : [],
        }),
      });
      if (path === "/api/notes/workspace") {
        if (method === "GET" && state.failLoad)
          return send({ error: "Synthetic read failure." }, 503);
        if (method === "POST" && state.basic) {
          let n = state.notes.find(
            (n) => n.owner_id === owner && n.id === (body.id ?? body.clientKey),
          );
          if (n && body.expectedUpdatedAt !== n.updated_at)
            return send(
              { error: "Newer note exists.", code: "note_conflict" },
              409,
            );
          if (!n) {
            n = {
              id: body.clientKey,
              owner_id: owner,
              created_at: new Date().toISOString(),
            };
            state.notes.push(n);
          }
          Object.assign(n, {
            title: body.title,
            body: body.body,
            kind: body.kind,
            contact_id: body.metadata.contactIds[0] ?? null,
            updated_at: new Date().toISOString(),
          });
          return send({ note: basicNote(n), mode: "basic" });
        }
        if (method === "GET")
          return send({
            notes: state.notes
              .filter((n) => n.owner_id === owner)
              .map((n) => (state.basic ? basicNote(n) : n)),
            mode: state.basic ? "basic" : "advanced",
            contacts: owner === "owner_a" ? [contact] : [],
          });
        if (state.failSave)
          return send({ error: "Synthetic save outage." }, 503);
        let n = state.notes.find(
          (n) =>
            n.owner_id === owner &&
            (body.id ? n.id === body.id : n.client_key === body.clientKey),
        );
        if (state.conflict) {
          if (n) {
            n.revision++;
            n.body = "Newer edit from another device.";
          }
          state.conflict = false;
          return send({ error: "A newer version exists." }, 409);
        }
        if (n && body.expectedRevision !== n.revision)
          return send({ error: "A newer version exists." }, 409);
        if (!n) {
          n = {
            id: id(200 + state.notes.length),
            client_key: body.clientKey,
            revision: 0,
            owner_id: owner,
            created_at: new Date().toISOString(),
          };
          state.notes.push(n);
        } else state.versions.push(structuredClone(n));
        Object.assign(n, {
          title: body.title,
          body: body.body,
          kind: body.kind,
          metadata: body.metadata,
          revision: n.revision + 1,
          contact_id: body.metadata.contactIds[0] ?? null,
          updated_at: new Date().toISOString(),
        });
        return send({ note: n });
      }
      if (path.endsWith("/versions"))
        return send({
          versions: state.versions
            .filter((n) => n.owner_id === owner && n.id === path.split("/")[3])
            .map((n) => ({ ...n, id: id(500 + n.revision) })),
        });
      if (path === "/api/notes/planner" || path === "/api/tasks")
        return send({ tasks: state.tasks.filter((t) => t.owner_id === owner) });
      if (path.endsWith("/tasks") && method === "POST") {
        if (!body.approved) return send({ error: "Approval required" }, 400);
        const note = state.notes.find(
          (n) => n.owner_id === owner && n.id === path.split("/")[3],
        );
        if (!note) return send({ error: "Not found" }, 404);
        let t = state.tasks.find(
          (t) => t.owner_id === owner && t.note_action_key === body.actionKey,
        );
        if (!t) {
          t = {
            id: id(400 + state.tasks.length),
            owner_id: owner,
            contact_id: body.contactId || id(2),
            title: body.title,
            source_note_id: note.id,
            note_action_key: body.actionKey,
            due_at: body.dueAt,
            completed: false,
            priority: body.priority,
          };
          state.tasks.push(t);
        }
        return send({ task: t });
      }
      if (path.startsWith("/api/notes/") && method === "DELETE") {
        state.notes = state.notes.filter(
          (n) => n.owner_id !== owner || n.id !== path.split("/")[3],
        );
        return send({ deleted: true });
      }
      if (path === "/api/notes/assist")
        return send({
          summary: {
            overview: "The note records a preference for a garden.",
            discussion: [
              { text: "Garden requested", quote: "requested a garden" },
            ],
            preferences: [
              { text: "Garden requested", quote: "requested a garden" },
            ],
            decisions: [],
            commitments: [],
            questions: ["Confirm timing and budget."],
            suggestions: [
              {
                title: "Review garden preferences",
                description: "Review the recorded garden request.",
                quote: "requested a garden",
              },
            ],
            draft: "",
          },
        });
      if (path === "/api/calendar/events" && state.failCalendar)
        return send({ error: "Unavailable" }, 503);
      if (path === "/api/calendar/events")
        return send({ agenda: [], complete: true, googleError: null });
      if (path === "/api/settings")
        return send({
          settings: {
            profile: { fullName: "Alex Morgan" },
            billing: { plan: "starter" },
            workspace: { name: "Review workspace" },
          },
        });
      if (path === "/api/notifications")
        return send({ notifications: [], unreadCount: 0 });
      if (path === "/api/health")
        return send({ status: "ok", supabase: true, clerk: true });
      return send({});
    },
  };
};
