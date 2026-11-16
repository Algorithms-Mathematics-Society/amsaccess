import assert from "node:assert/strict";
import test from "node:test";
import { contactEntry } from "../../src/lib/contact-entry.ts";

test("public login handoff starts in Support without candidate data", () => {
  assert.deepEqual(contactEntry({ source: "access-login", email: "private@example.test", message: "secret" }), { category: "Support", signInHelp: true });
});

test("ordinary and security entry points retain their categories", () => {
  assert.deepEqual(contactEntry({}), { category: "Sales", signInHelp: false });
  for (const topic of ["Sales", "Support", "Security"]) {
    assert.deepEqual(contactEntry({ topic }), { category: topic, signInHelp: false });
  }
});

test("unknown and repeated query parameters cannot inject a category or login context", () => {
  for (const topic of ["support", "<script>", ["Support", "Sales"], ""]) {
    assert.deepEqual(contactEntry({ topic, source: "access-login" }), { category: "Sales", signInHelp: false });
  }
  for (const source of ["unknown", ["access-login"], undefined]) {
    assert.deepEqual(contactEntry({ topic: "Support", source }), { category: "Support", signInHelp: false });
  }
});

test("explicit topic remains authoritative over the login source", () => {
  for (const topic of ["Sales", "Security"]) {
    assert.deepEqual(contactEntry({ topic, source: "access-login" }), { category: topic, signInHelp: false });
  }
  for (const source of ["unknown", ["access-login"], undefined]) {
    assert.deepEqual(contactEntry({ source }), { category: "Sales", signInHelp: false });
  }
});
