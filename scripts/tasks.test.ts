import assert from "node:assert/strict";
import {
  PreferencesSchema,
  TaskMetaSchema,
  TaskEditSchema,
  AssignmentSchema,
  meta,
  priority,
  filterTasks,
  metrics,
  cycleWouldForm,
  blocked,
  proposedDeadlines,
  transactionProgress,
  type TaskRecord,
  type TaskTransaction,
} from "../lib/tasks/workspace-model";
import { TASK_TEMPLATES } from "../lib/tasks/templates";
import { validateProposals } from "../lib/tasks/ai";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const t = (n: number, patch: Partial<TaskRecord> = {}): TaskRecord => ({
  id: id(n),
  owner_id: "a",
  contact_id: id(1),
  title: "Task " + n,
  due_at: null,
  completed: false,
  ...patch,
});
const now = new Date("2026-10-22T14:00Z"),
  zone = "America/New_York",
  contacts = [
    {
      id: id(1),
      first_name: "Alex",
      email: "test@example.test",
      property_address: "Actual owned address",
    },
  ];
const tasks = [
  t(10, { due_at: "2026-10-22T02:00Z", priority: "high" }),
  t(11, {
    due_at: "2026-10-22T15:00Z",
    workspace: {
      propertyContactId: id(1),
      assigneeId: "agent",
      status: "in_progress",
    },
  }),
  t(12, {
    completed: true,
    completed_at: "2026-10-22T12:00Z",
    due_at: "2026-10-24T12:00Z",
  }),
  t(13, { completed: true, completed_at: "2026-10-01T12:00Z" }),
  t(14, { due_at: "2026-10-26T12:00Z" }),
];
assert.equal(
  priority(t(30, { title: "Urgent important task" })),
  "unspecified",
);
assert.equal(
  meta(t(30, { property_contact_id: id(1) })).propertyContactId,
  id(1),
);
const m = metrics(tasks, zone, now);
assert.deepEqual(m, {
  open: 3,
  completed: 1,
  due: 2,
  overdue: 1,
  today: 1,
  weekTotal: 3,
  weekDone: 1,
});
for (const [scope, count] of [
  ["overdue", m.overdue],
  ["due-week", m.due],
  ["completed-week", m.completed],
] as const)
  assert.equal(
    filterTasks(tasks, PreferencesSchema.parse({ scope }), contacts, zone, now)
      .length,
    count,
  );
const p = PreferencesSchema.parse({
  search: "Alex",
  propertyId: id(1),
  status: "in_progress",
  assigneeId: "agent",
});
assert.deepEqual(
  filterTasks(tasks, p, contacts, zone, now).map((t) => t.id),
  [id(11)],
);
assert.equal(
  filterTasks(tasks, { ...p, search: "missing" }, contacts, zone, now).length,
  0,
);
assert.equal(
  cycleWouldForm(
    [t(1), t(2, { workspace: { dependencies: [id(1)] } })],
    id(1),
    [id(2)],
  ),
  true,
);
assert.equal(
  blocked(t(2, { workspace: { dependencies: [id(99)] } }), tasks),
  true,
);
assert.equal(
  blocked(t(2, { workspace: { dependencies: [id(12)] } }), tasks),
  false,
);
assert.throws(() => TaskEditSchema.parse({ id: id(5), title: "  " }));
assert.throws(() => AssignmentSchema.parse({ id: id(1), approved: false }));
assert.equal(TASK_TEMPLATES.length, 8);
for (const template of TASK_TEMPLATES) {
  template.steps.forEach((s, i) => assert(s.dependsOn.every((n) => n < i)));
  assert.equal(
    proposedDeadlines(template, "2026-03-07", zone).length,
    template.steps.length,
  );
}
assert.throws(() => proposedDeadlines(TASK_TEMPLATES[0], "2026-02-30", zone));
const tx = {
  payload: { taskIds: [id(10), id(12), id(99)] },
} as TaskTransaction;
const progress = transactionProgress(tx, tasks, zone, now);
assert.equal(progress.total, 3);
assert.equal(progress.done, 1);
assert.equal(progress.missing, 1);
assert.equal(progress.percent, 33);
const source = "Call Alex and prepare a listing presentation.";
const raw = {
  summary: "Two proposals",
  questions: [],
  tasks: [{ title: "Call Alex", quote: "Call Alex", contactId: id(1) }],
};
assert.equal(
  validateProposals("```json\n" + JSON.stringify(raw) + "\n```", source, [
    id(1),
  ]).tasks.length,
  1,
);
assert.throws(() => validateProposals("{broken", source, []));
assert.throws(() => validateProposals("", source, []));
assert.throws(() =>
  validateProposals(
    { ...raw, tasks: [{ ...raw.tasks[0], contactId: id(2) }] },
    source,
    [id(1)],
  ),
);
assert.throws(() =>
  validateProposals(
    { ...raw, tasks: [{ ...raw.tasks[0], quote: "invented quote" }] },
    source,
    [id(1)],
  ),
);
assert.equal(
  validateProposals(
    { summary: "Please clarify", questions: ["Which client?"], tasks: [] },
    source,
    [],
  ).tasks.length,
  0,
);
console.log(
  "PASS Tasks model: exact timezone counts/filter consistency, actual priorities, combined filters/empty, dependency cycles, editable templates/proposed dates, missing milestones, structured grounded AI/malformed/foreign responses.",
);
// Every built-in is actionable; closing milestones never invent an unknown closing date.
for (const template of TASK_TEMPLATES) {
  assert.equal(new Set(template.steps.map(s=>s.notes)).size,template.steps.length);
  assert.ok(template.steps.every(s=>s.notes.length>60));
}
const buyerClosing=TASK_TEMPLATES.find(t=>t.id==="buyer-contract")!;
assert.ok(proposedDeadlines(buyerClosing,"2026-10-23","UTC").slice(6).every(d=>d===null));
assert.deepEqual(proposedDeadlines(buyerClosing,"2026-10-23","UTC","2026-10-30").slice(6),["2026-10-25T09:00:00.000Z","2026-10-29T09:00:00.000Z","2026-10-30T09:00:00.000Z"]);
