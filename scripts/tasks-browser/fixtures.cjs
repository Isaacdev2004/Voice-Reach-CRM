module.exports = function () {
  const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  let seq = 100;
  const today = new Date().toISOString().slice(0, 10),
    day = (n) =>
      new Date(Date.parse(today + "T16:00Z") + n * 86400000).toISOString();
  const state = { tasks: [], prefs: {}, writes: [], fail: false };
  function reset() {
    state.tasks = [
      {
        id: id(10),
        owner_id: "owner_a",
        contact_id: id(1),
        title: "Review buyer priorities",
        notes: "Review actual client needs.",
        due_at: day(0),
        reminder_at: null,
        priority: "high",
        completed: false,
        updated_at: day(-1),
        workspace: { category: "Buyer", propertyContactId: id(1) },
      },
      {
        id: id(11),
        owner_id: "owner_a",
        contact_id: id(2),
        title: "Prepare listing presentation",
        due_at: day(1),
        completed: false,
        priority: "medium",
        updated_at: day(-1),
        workspace: { category: "Listing", status: "in_progress" },
      },
      {
        id: id(12),
        owner_id: "owner_a",
        contact_id: id(1),
        title: "Review agreement",
        due_at: day(-1),
        completed: false,
        priority: "low",
        updated_at: day(-1),
        workspace: {},
      },
      {
        id: id(13),
        owner_id: "owner_a",
        contact_id: id(2),
        title: "Send approved checklist",
        due_at: day(0),
        completed: true,
        completed_at: day(0),
        updated_at: day(-1),
        workspace: {},
      },
    ];
    state.prefs = {};
    state.writes = [];
    state.fail = false;
    state.actor = "owner_a";
    state.transactions = [];
  }
  reset();
  const contacts = [
    {
      id: id(1),
      first_name: "Alex",
      last_name: "Client",
      email: "client@example.test",
      property_address: "123 Synthetic Lane",
    },
    {
      id: id(2),
      first_name: "Jordan",
      last_name: "Seller",
      property_address: "456 QA Avenue",
    },
  ];
  const templates = require("../campaign-audit/harness.cjs")
    .fixture()
    .load("lib/tasks/templates").TASK_TEMPLATES;
  async function handle(req, res, url) {
    if (!url.pathname.startsWith("/api/")) return false;
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let b = raw ? JSON.parse(raw) : {};
    const reply = (data, status = 200) => {
      res.statusCode = status;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          success: status < 400,
          data,
          error: status >= 400 ? "Please retry." : undefined,
        }),
      );
      return true;
    };
    const path = url.pathname;
    if (path === "/api/tasks") {
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          success: true,
          tasks: state.tasks.map((t) => ({
            ...t,
            contacts: contacts.find((c) => c.id === t.contact_id),
          })),
        }),
      );
      return true;
    }
    if (path === "/api/tasks/workspace") {
      if (state.fail) return reply({}, 503);
      if (state.actor === "owner_b" && req.method === "GET")
        return reply({
          tasks: [],
          contacts: [],
          members: [{ id: "owner_b", name: "Other agent" }],
          timezone: "America/New_York",
          monday: true,
          inAppReminders: false,
          preferences: {},
          advanced: true,
          transactions: [],
        });
      if (req.method === "POST") {
        state.writes.push(b);
        const previous = state.tasks.find((t) => t.id === b.id);
        const row = {
          id: b.id,
          owner_id: "owner_a",
          contact_id: b.contactId ?? id(1),
          title: b.title,
          notes: b.notes,
          due_at: b.dueAt,
          reminder_at: b.reminderAt,
          completed: b.completed,
          completed_at: b.completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
          priority: b.priority,
          workspace: b.workspace,
          recurrence: b.recurrence,
        };
        if (previous) Object.assign(previous, row);
        else state.tasks.push(row);
        return reply({ task: row, calendar: "Saved to MyARI Calendar." });
      }
      if (req.method === "DELETE") {
        state.tasks = state.tasks.filter(
          (t) => t.id !== url.searchParams.get("id"),
        );
        return reply({ deleted: true });
      }
      return reply({
        tasks: state.tasks,
        contacts,
        members: [{ id: "owner_a", name: "Alex Agent" }],
        timezone: "America/New_York",
        monday: true,
        inAppReminders: true,
        preferences: state.prefs,
        advanced: true,
        transactions: state.transactions ?? [],
      });
    }
    if (path === "/api/tasks/preferences") {
      state.prefs = b;
      return reply({ preferences: b });
    }
    if (path === "/api/tasks/templates") return reply({ templates });
    if (path === "/api/calendar/events") return reply({ agenda: [] });
    if (path === "/api/notes/workspace") return reply({ notes: [] });
    if (path === "/api/tasks/ai")
      return reply({
        summary: "Review this proposal.",
        questions: [],
        tasks: [
          {
            title: "Call Alex",
            notes: "Confirm needs",
            quote: "Call Alex",
            contactId: id(1),
            dueAt: null,
            priority: "unspecified",
          },
        ],
      });
    if (path === "/api/tasks/proposals") {
      state.writes.push(b);
      for (const t of b.tasks)
        state.tasks.push({
          id: t.id,
          owner_id: "owner_a",
          contact_id: t.contactId,
          title: t.title,
          notes: t.notes,
          due_at: t.dueAt,
          completed: false,
          workspace: t.workspace,
        });
      return reply({ taskIds: b.tasks.map((t) => t.id) });
    }
    if (path === "/api/tasks/checklists") {
      state.writes.push(b);
      const ids = b.template.steps.map(() => id(seq++));
      state.transactions = [
        {
          id: b.id,
          contact_id: b.contactId,
          owner_id: "owner_a",
          payload: {
            ...b,
            name: b.template.name,
            kind: b.template.kind,
            taskIds: ids,
          },
          created_at: new Date().toISOString(),
        },
      ];
      b.template.steps.forEach((s, i) =>
        state.tasks.push({
          id: ids[i],
          owner_id: "owner_a",
          contact_id: b.contactId,
          title: s.title,
          notes: s.notes,
          due_at: day(i),
          completed: false,
          priority: s.priority,
          workspace: {
            transactionId: b.id,
            dependencies: s.dependsOn.map((n) => ids[n]),
          },
        }),
      );
      return reply({ transaction: state.transactions[0] });
    }
    if (path === "/api/health")
      return reply({ status: "ok", supabase: true, clerk: true });
    if (path === "/api/billing/plan")
      return reply({ planId: "pro", usage: { contacts: 0 } });
    if (path === "/api/settings") return reply({});
    if (path.includes("notifications"))
      return reply({ notifications: [], unreadCount: 0 });
    return reply({});
  }
  return { state, reset, handle };
};
