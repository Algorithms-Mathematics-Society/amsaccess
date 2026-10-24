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
  ).outputText + "\nexports.Conversation = Conversation;";
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
} = {}) {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  if (pending) saveSupportDraft(storage, uid, { draft: pending.body, pending });
  const states = [],
    refs = [],
    effects = [];
  const calls = [],
    jobs = [];
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
      startOrgPolling: (task) => {
        jobs.push(task());
        return () => {};
      },
    },
    "@/lib/client/useOrgRole": {},
    "@/lib/client/support": {
      loadSupportThread: async () => thread,
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
    tree = context.exports.Conversation({ uid, onChange() {} });
    for (const effect of effects)
      if (effect.run) {
        effect.run = false;
        effect.cleanup?.();
        effect.cleanup = effect.callback();
      }
    return tree;
  }
  async function settle() {
    await Promise.all(jobs.splice(0));
    await new Promise((resolve) => setImmediate(resolve));
    render();
  }
  function visit(node) {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(visit);
    return [node, ...visit(node.props?.children)];
  }
  return { render, settle, nodes: () => visit(tree), calls, storage };
}

test("a committed reply with a lost acknowledgement can retry after resolution without reopening", async () => {
  const h = harness();
  h.render();
  await h.settle();
  assert.equal(
    h
      .nodes()
      .find(
        (node) => node.type === "Button" && node.props.label === "Retry reply",
      ).props.isDisabled,
    false,
  );
  assert.equal(
    h.nodes().find((node) => node.type === "TextArea").props.isDisabled,
    true,
  );
  h.nodes()
    .find((node) => node.type === "form")
    .props.onSubmit({ preventDefault() {} });
  await h.settle();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][0], `/${uid}/messages`);
  assert.equal(h.calls[0][1], "POST");
  assert.equal(h.calls[0][2].uid, reply.uid);
  assert.equal(h.calls[0][2].body, reply.body);
  assert.equal(readSupportDraft(h.storage, uid).pending, null);
  assert.equal(
    h.nodes().some((node) => node.type === "form"),
    false,
    "resolved issues cannot compose a new reply",
  );
});

test("an unsent pending reply remains retryable with explicit reopen after the server rejects it as resolved", async () => {
  const h = harness({
    request: async (_path, method) => {
      if (method === "POST")
        throw new Error("This issue is resolved. Reopen it before sending.");
      return { status: "open" };
    },
  });
  h.render();
  await h.settle();
  h.nodes()
    .find((node) => node.type === "form")
    .props.onSubmit({ preventDefault() {} });
  await h.settle();
  assert.equal(readSupportDraft(h.storage, uid).pending.uid, reply.uid);
  assert.match(
    h
      .nodes()
      .find(
        (node) =>
          node.type === "Banner" && node.props.title === "Action not confirmed",
      ).props.description,
    /resolved/,
  );
  assert.equal(
    h
      .nodes()
      .find(
        (node) => node.type === "Button" && node.props.label === "Reopen issue",
      ).props.isDisabled,
    false,
  );
  assert.equal(
    h
      .nodes()
      .find(
        (node) => node.type === "Button" && node.props.label === "Retry reply",
      ).props.isDisabled,
    false,
  );
  h.nodes()
    .find(
      (node) => node.type === "Button" && node.props.label === "Reopen issue",
    )
    .props.onClick();
  await h.settle();
  assert.equal(h.calls[1][1], "PATCH");
  assert.equal(h.calls[1][2].status, "open");
  assert.equal(readSupportDraft(h.storage, uid).pending.uid, reply.uid);
});

test("a resolved issue without a pending reply never offers a new message composer", async () => {
  const h = harness({ pending: null });
  h.render();
  await h.settle();
  assert.equal(
    h.nodes().some((node) => node.type === "form"),
    false,
  );
  assert.equal(h.calls.length, 0);
});
