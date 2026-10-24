import test from "node:test";
import assert from "node:assert/strict";
import {
  readSupportDraft,
  saveSupportDraft,
  acknowledgeSupportReply,
} from "../../src/lib/client/support-draft.ts";
const uid = "e364cd25-61df-402a-949a-d169afcc1741";
const other = "57fb421c-06ee-47a2-a462-ab301f3892da";
const reply = {
  uid: "5a2a0316-b07d-4eaf-a7cd-bea46816902d",
  body: "Please try signing in again.",
};
function memory() {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
    values,
  };
}
test("draft and pending identifier survive a remount without leaking into another conversation", () => {
  const storage = memory();
  saveSupportDraft(storage, uid, { draft: reply.body, pending: reply });
  assert.deepEqual(readSupportDraft(storage, uid), {
    draft: reply.body,
    pending: reply,
  });
  assert.deepEqual(readSupportDraft(storage, other), {
    draft: "",
    pending: null,
  });
});
test("only the matching acknowledgement clears the outbox", () => {
  const storage = memory();
  saveSupportDraft(storage, uid, { draft: reply.body, pending: reply });
  acknowledgeSupportReply(storage, uid, other);
  assert.equal(readSupportDraft(storage, uid).pending.uid, reply.uid);
  acknowledgeSupportReply(storage, uid, reply.uid);
  assert.deepEqual(readSupportDraft(storage, uid), {
    draft: "",
    pending: null,
  });
});
test("a late acknowledgement cannot erase a newer draft", () => {
  const storage = memory();
  saveSupportDraft(storage, uid, {
    draft: "A later reply",
    pending: { uid: other, body: "A later reply" },
  });
  acknowledgeSupportReply(storage, uid, reply.uid);
  assert.equal(readSupportDraft(storage, uid).draft, "A later reply");
});
test("corrupt outboxes fail explicitly instead of regenerating retry identifiers", () => {
  const storage = memory();
  for (const raw of [
    "{",
    '{"draft":"x","pending":{"uid":"bad","body":"x"}}',
    '{"draft":42}',
    '{"draft":"x","pending":{"uid":"5a2a0316-b07d-4eaf-a7cd-bea46816902d","body":" "}}',
  ]) {
    storage.values.set(`ams_org_support_draft_v1:${uid}`, raw);
    assert.throws(() => readSupportDraft(storage, uid));
  }
});
test("inaccessible storage errors remain visible to the owning view", () => {
  const storage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {},
  };
  assert.throws(() => readSupportDraft(storage, uid), /blocked/);
  assert.throws(
    () => saveSupportDraft(storage, uid, { draft: "x", pending: null }),
    /blocked/,
  );
});
