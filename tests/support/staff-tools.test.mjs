import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {
  readSupportDraft,
  saveSupportDraft,
  acknowledgeSupportReply,
} from "../../src/lib/client/support-draft.ts";

const code =
  ts.transpileModule(
    readFileSync(
      new URL("../../src/components/org/SupportInbox.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText + "\nexports.StaffTools = StaffTools;";
const uid = "e364cd25-61df-402a-949a-d169afcc1741";
const reply = {
  uid: "5a2a0316-b07d-4eaf-a7cd-bea46816902d",
  body: "Please retry signing in.",
};
const resolved = {
  uid,
  name: "Candidate",
  email: "a@example.com",
  phone: "1234567890",
  status: "resolved",
  messages: [],
  has_more: false,
};
const jsx = (type, props) => ({ type, props });

function harness({
  thread = resolved,
  pending = reply,
  request = async () => ({ uid: reply.uid }),
  actor = "actor",
  eligible = async () => [
    { uid, display_name: "Staff", email: "staff@example.test" },
  ],
} = {}) {
  const actorReads = [];
  const events = new EventTarget();
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  if (pending)
    saveSupportDraft(storage, `${uid}:internal-note:actor`, {
      draft: pending.body,
      pending,
    });
  const states = [],
    refs = [],
    effects = [];
  const calls = [],
    jobs = [],
    tasks = [];
  let stateIndex = 0,
    refIndex = 0,
    effectIndex = 0;
  const mocks = {
    react: {
      useState(initial) {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [
          states[index],
          (next) => {
            states[index] =
              typeof next === "function" ? next(states[index]) : next;
          },
        ];
      },
      useRef(initial) {
        return (refs[refIndex++] ??= { current: initial });
      },
      useEffect(callback, deps) {
        const index = effectIndex++;
        const previous = effects[index];
        if (
          previous &&
          deps.every((value, i) => Object.is(value, previous.deps[i]))
        )
          return;
        effects[index] = {
          deps,
          callback,
          cleanup: previous?.cleanup,
          run: true,
        };
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "next/navigation": { useRouter: () => ({}) },
    "@/lib/client/orgPolling": {
      startOrgSupportPolling: (task) => {
        tasks.push(task);
        jobs.push(task().catch(() => {}));
        return () => {};
      },
    },
    "@/lib/client/useOrgRole": {
      fetchOrgMe: async (fresh) => {
        actorReads.push(fresh);
        return { uid: fresh ? actor : "previous-account" };
      },
    },
    "@/lib/client/support": {
      loadSupportAssignees: eligible,
      loadSupportNotes: async () => ({
        notes: [],
        has_more: false,
        next_cursor: null,
      }),
      assignSupport: async (...args) => {
        calls.push(args);
        return request(...args);
      },
      supportApi: async (...args) => {
        calls.push(args);
        return request(...args);
      },
    },
    "@/lib/client/support-draft": {
      readSupportDraft,
      saveSupportDraft,
      acknowledgeSupportReply,
    },
    "./OrgAstryxTheme": {},
  };
  const context = {
    exports: {},
    Error,
    sessionStorage: storage,
    window: events,
    crypto: {
      randomUUID: () => {
        throw new Error("A pending reply must retain its UUID");
      },
    },
    require(name) {
      if (mocks[name]) return mocks[name];
      const component = name.split("/").at(-1);
      return { [component]: component, HStack: "HStack", VStack: "VStack" };
    },
  };
  vm.runInNewContext(code, context);
  let tree;
  function render() {
    stateIndex = refIndex = effectIndex = 0;
    tree = context.exports.StaffTools({ thread, onChange() {} });
    for (const effect of effects)
      if (effect.run) {
        effect.run = false;
        effect.cleanup?.();
        effect.cleanup = effect.callback();
      }
    return tree;
  }
  async function settle() {
    for (let pass = 0; pass < 3; pass++) {
      await Promise.all(jobs.splice(0));
      await new Promise((resolve) => setImmediate(resolve));
      render();
    }
  }
  function visit(node) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(visit);
    return [node, ...visit(node.props?.children)];
  }
  return {
    render,
    settle,
    nodes: () => visit(tree),
    calls,
    storage,
    events,
    thread,
    tasks,
    actorReads,
  };
}

test("private notes recover separately and retry the same id after failed acknowledgement", async () => {
  let attempts = 0;
  const h = harness({
    request: async () => {
      if (!attempts++) throw new Error("unconfirmed");
      return { uid: reply.uid };
    },
  });
  h.render();
  await h.settle();
  const submit = () =>
    h
      .nodes()
      .find((node) => node.type === "form")
      .props.onSubmit({ preventDefault() {} });
  submit();
  await h.settle();
  assert.equal(
    readSupportDraft(h.storage, `${uid}:internal-note:actor`).pending.uid,
    reply.uid,
  );
  assert.equal(readSupportDraft(h.storage, uid).pending, null);
  assert(h.nodes().some((node) => node.props?.role === "alert"));
  submit();
  await h.settle();
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[0][0], `/${uid}/notes`);
  assert.equal(h.calls[1][2].uid, h.calls[0][2].uid);
  assert.equal(
    readSupportDraft(h.storage, `${uid}:internal-note:actor`).pending,
    null,
  );
});

test("assignment uses selected eligible staff and keeps selection after failure", async () => {
  let attempts = 0;
  const h = harness({
    pending: null,
    request: async () => {
      if (!attempts++) throw new Error("Assignment unavailable");
      return {};
    },
  });
  h.render();
  await h.settle();
  h.nodes()
    .find((node) => node.type === "select")
    .props.onChange({ target: { value: uid } });
  h.render();
  h.nodes()
    .find((node) => node.props?.label === "Save assignment")
    .props.onClick();
  await h.settle();
  assert.equal(
    h.nodes().find((node) => node.type === "select").props.value,
    uid,
  );
  assert(h.nodes().some((node) => node.props?.role === "alert"));
  h.nodes()
    .find((node) => node.props?.label === "Save assignment")
    .props.onClick();
  await h.settle();
  assert.deepEqual(
    h.calls.map((call) => Array.from(call)),
    [
      [uid, uid],
      [uid, uid],
    ],
  );
});

test("session reset clears private content and fences stale controls", async () => {
  const h = harness();
  h.render();
  await h.settle();
  const staleSubmit = h.nodes().find((node) => node.type === "form")
    .props.onSubmit;
  h.events.dispatchEvent(new Event("ams:org-session-reset"));
  h.render();
  staleSubmit({ preventDefault() {} });
  await h.settle();
  assert.equal(h.calls.length, 0);
  assert.equal(
    h
      .nodes()
      .some((node) => node.type === "TextArea" || node.type === "select"),
    false,
  );
});

test("private outboxes use a fresh actor instead of a cached prior account", async () => {
  const h = harness({ actor: "other-account" });
  h.render();
  await h.settle();
  assert.deepEqual(h.actorReads, [true]);
  assert.equal(
    h.nodes().find((node) => node.type === "TextArea").props.value,
    "",
  );
  assert.equal(
    readSupportDraft(h.storage, `${uid}:internal-note:actor`).pending.uid,
    reply.uid,
  );
});

test("external assignment updates sync until the operator edits the selection", async () => {
  const thread = { ...resolved };
  const h = harness({ thread, pending: null });
  h.render();
  await h.settle();
  thread.assignee = { uid, display_name: "Staff", email: "staff@example.test" };
  h.render();
  h.render();
  assert.equal(
    h.nodes().find((node) => node.type === "select").props.value,
    uid,
  );
  h.nodes()
    .find((node) => node.type === "select")
    .props.onChange({ target: { value: "" } });
  thread.assignee = null;
  h.render();
  h.render();
  assert.equal(
    h.nodes().find((node) => node.type === "select").props.value,
    "",
  );
});

test("a successful staff read restores tools after a permission refusal", async () => {
  let denied = false;
  const h = harness({
    pending: null,
    eligible: async () => {
      if (denied) throw Object.assign(new Error("Forbidden"), { status: 403 });
      return [];
    },
  });
  h.render();
  await h.settle();
  denied = true;
  await h.tasks
    .at(-1)()
    .catch(() => {});
  h.render();
  assert.equal(
    h.nodes().find((node) => node.type === "TextArea").props.isDisabled,
    true,
  );
  denied = false;
  await h.tasks.at(-1)();
  h.render();
  assert.equal(
    h.nodes().find((node) => node.type === "TextArea").props.isDisabled,
    false,
  );
});
