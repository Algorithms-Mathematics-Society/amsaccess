# fablee.md — Dashboard Question-Authoring: Plan, Sync Audit & UI Changelog

> Scope agreed with owner: **UI work only on the dashboard (org portal) side of `AMS Access`.**
> Anything touching API routes, payload contracts, grading, or the student runtime
> (`/home/user/AccessSoftware`) is **flagged for audit below and NOT changed**.

---

## 1. System map (how a question travels)

```
AMS Access (this repo — organizer dashboard)
  src/app/(org)/org/contests/[id]/page.tsx   ← QuestionsTab / QuestionForm / FollowUpEditor
  src/components/CPProblemStudio.tsx          ← statement, validator/checker, tests, prejudge
  src/components/MarkovEditor.tsx             ← markov answer-key canvas
        │  POST/PATCH /api/org/contests/:id/questions[/:qid]
        │  PUT  …/:qid/cp-config   (checker/validator/generator)
        │  PUT  …/:qid/tests/upsert, …/generators, …/prejudge
        ▼
  Supabase / backend (questions table: title, description, points,
  question_type, time_limit_ms, memory_limit_mb, markov_answer_json, …)
        ▼
AccessSoftware (student runtime — Tauri desktop + web)
  apps/web/src/app/session/contest/client.tsx ← fetches questions, renders statement
  apps/web/src/components/MarkovEditor.tsx    ← student-side markov canvas (duplicate copy)
```

Key contract facts verified on both sides:

- `description` is one markdown blob. The Studio composes it from sections using the
  exact headings `### Input Format`, `### Output Format`, `### Sample Input`,
  `### Sample Output`, `### Note` — and re-parses those headings when editing.
- Student client (`client.tsx`) renders `description` with `marked` + math extension
  + **DOMPurify sanitization**, and splits tabs on headings matching
  `/examples?|samples?/` and `/constraints?|limits?/`.
- `follow_up`: parts are stored as a JSON array **inside `description`**
  (`{id, statement, expected_answer, points}`); the client parses the same field.
- `markov`: answer key saved as `markov_answer_json` = `normalizeChain(...)`
  (`states` without x/y + `transitions`). Verified: `normalizeChain` output shape is
  identical in both repos today.
- `code`/`interactive`: cp-config saved separately (`checker_type` `"token" | "custom"`,
  `checker_code`, `validator_code`, `generator_script`). Save ordering already handles
  partial failure (cp-config first on edit; compensating DELETE on create).

---

## 2. Connection / sync audit — FLAGGED, DO NOT CHANGE WITHOUT AUDIT

| # | Severity | Finding |
|---|----------|---------|
| C1 | **HIGH** | **Follow-up answers likely leak to the student client.** Dashboard stores `expected_answer` inside `description` JSON; the student client receives `question.description` and parses the same array (`ClientFollowUpPart` merely *omits* the field from its TS type — the data is still in the payload unless the backend strips it). Audit: confirm whether the sessions API redacts `expected_answer` before serving students. If not, answers are readable via devtools. |
| C2 | **HIGH** | **Interactive `<code>` HTML widgets die on the student side.** Studio preview renders raw widget HTML (incl. inline `oninput=` handlers) via `dangerouslySetInnerHTML`; the student client runs DOMPurify, which strips inline event handlers and scripts. The authoring preview shows a working widget; students get a dead one. (UI mitigation applied: the broken-by-design widget was removed from the *default template* — see U5. The renderer mismatch itself needs a contract decision.) |
| C3 | MED | **Three divergent markdown renderers** for one statement: `renderMarkdownPreview` (page.tsx, markov preview), `renderStatementHtml` (Studio preview), and `marked`+DOMPurify+math (student client). Math, italics, lists, and code blocks behave differently in each. Long-term: extract one shared renderer (or render previews with the same `marked` pipeline + DOMPurify config as the client). |
| C4 | MED | **`MarkovEditor.tsx` is copy-pasted across repos and has already drifted** (canvas size, helpers, comments). `normalizeChain` still matches, but nothing enforces it. Audit: move to a shared package or add a cross-repo contract test on the JSON shape. |
| C5 | MED | **`html_starter` is overloaded as the C++ starter-code channel.** Student client uses it only if `looksLikeCpp(payload.html_starter)`. Fragile heuristic; the dashboard still ships legacy `html/css/js_starter` fields with no authoring UI. Audit: introduce an explicit `starter_code` column/field. |
| C6 | MED | **Switching question type on an existing question leaves stale grading config.** E.g. a `code` question edited into `markov` keeps its old cp-config rows; a `markov` → `code` switch keeps `markov_answer_json`. Backend/grader behavior for the stale rows is unverified. (UI mitigation applied: warning banner on type change for existing questions — see U8.) |
| C7 | LOW | `order_index` gaps: new questions get `questions.length + 1`; deletes leave holes; there is no reorder UI. Verify the grader/client sorts strictly by `order_index` and tolerates gaps; add a reorder endpoint before building drag-to-reorder UI. |
| C8 | LOW | Prejudge polling + `tests/generate` job flow has many client-driven states; no audit of server idempotency was done here. Leave as-is. |
| C9 | LOW | `parseDescription` on the student side returns `""` during SSR (`typeof window === "undefined"`) — fine for Tauri, but worth confirming for the web build's prerender. |

---

## 3. UI problems found on the dashboard (authoring flow)

1. **Data-corrupting defaults (worst one).** `QuestionForm` seeded `description` with a full
   "Maximum Subarray" template (Unsplash stock image + inline-JS widget that C2 proves is
   broken for students). Worse: when *editing* an existing question whose statement lacks a
   `### Note` / sample sections, the Studio kept its hardcoded Maximum-Subarray defaults for
   those fields and **silently appended them to the real question on save**.
2. **Init/compose deadlock latent bug.** Studio only set `isInitialized` when `description`
   was non-empty — with an empty statement, edits to any statement field were never composed
   back into `description` (silently saved empty).
3. Success message was never visible — `setSuccess(...)` is immediately followed by
   `onSaved()` which unmounts the form.
4. Delete question = single click, no confirmation, irreversible.
5. Question cards showed legacy `HTML/CSS/JS` badges (meaningless for CP) and no
   question type / limits.
6. "Add question" form and an "Edit" form could be open simultaneously (Edit didn't clear
   `adding`), doubling the page-widening side effect and confusing the procedure.
7. Save/Cancel buttons sit below a ~60vh dark studio — invisible while authoring; helper
   text "Save question first, then upload tests" is easy to miss.
8. Test Suite & Run tab is fully visible for *unsaved* questions; every action just errors
   with "Save question first." Procedure should be explicit up front.
9. `points` accepts `0`/`NaN` (only an HTML `min` attribute); no save-time validation.
10. Cancel discards all work silently.
11. Question type selector used hardcoded inline styles (off-design-system) and gave no
    hint about what each type means.
12. Statement preview rendered empty "Input Format / Output Format / Sample Tests" sections
    even when blank.

---

## 4. Implementation plan (one-by-one)

Ordered, smallest-risk-first. Items marked ✅ are done and logged in §5.

- **U1** ✅ Fix Studio init/compose deadlock (initialize even with empty statement).
- **U2** ✅ Replace hardcoded Maximum-Subarray defaults (format/sample/note fields) with
  empty values + instructive `placeholder`s. Kills the silent-append corruption (§3.1/3.2)
  and makes the readiness checklist honest (blank fields now correctly show "blocked").
- **U3** ✅ Gate empty preview sections; show a hint instead of empty panes.
- **U4** ✅ "Save the question first" lock banner at the top of the Test Suite & Run tab
  when the question is unsaved.
- **U5** ✅ Replace the giant default `description` in `QuestionForm` with empty string
  (placeholders now guide instead). Removes the stock image + dead inline-JS widget.
- **U6** ✅ Save-time validation: points ≥ 1 (code/interactive/markov), per-part points ≥ 1
  for follow-up.
- **U7** ✅ Question type selector: design-system styling + one-line description of the
  selected type.
- **U8** ✅ Amber warning when changing the type of an *existing* question (pairs with C6).
- **U9** ✅ Two-step delete confirmation (click → "Confirm delete?" → click again; auto-resets).
- **U10** ✅ Visible save feedback: transient success banner in `QuestionsTab` after the form
  closes.
- **U11** ✅ Edit closes the Add form (and vice-versa) — only one editor open at a time.
- **U12** ✅ Question cards: show type badge (Code / Interactive / Follow-up / Markov) +
  time/memory limits for judged types; removed legacy HTML/CSS/JS badges.
- **U13** ✅ Sticky save bar: Save/Cancel + status hint pinned to the bottom of the viewport
  while the form is open.
- **U14** ✅ Dirty-cancel guard: confirm before discarding unsaved edits.
- **U15** ✅ Empty state: actionable "Add your first question" CTA button.

Deferred (needs connection/audit work first): drag-to-reorder (C7), shared markdown
renderer (C3), shared MarkovEditor package (C4), explicit starter-code field (C5),
follow-up answer redaction (C1).

---

## 5. UI changelog (what actually changed) — 2026-06-13

Verified with `npx tsc --noEmit` (clean) and `next lint` on both files (only one
pre-existing warning at `CPProblemStudio.tsx:573`, untouched code).

### `src/components/CPProblemStudio.tsx`

- **U1 — init/compose fix.** The section-parsing effect now marks the studio
  initialized even when the incoming `description` is empty. Previously, an empty
  statement meant `isInitialized` was never set, so the compose effect never ran and
  every statement edit was silently dropped.
- **U2 — removed Maximum-Subarray defaults.** `inputFormatText`, `outputFormatText`,
  `sampleInputText`, `sampleOutputText`, `noteText` now start empty, with instructive
  `placeholder` text on each textarea (incl. LaTeX/markdown syntax hints in the
  description field). This also fixes the corruption where editing an existing
  question that lacked one of those sections silently appended the unrelated
  Maximum-Subarray default to its statement on save. Readiness checklist now honestly
  shows Constraints/Samples as blocked/pending until the author fills them.
- **U3 — preview gating.** The live statement preview only renders the
  Input Format / Output Format / Sample Tests blocks when they have content;
  empty-state hints shown otherwise.
- **U4 — pipeline lock.** "Test Suite & Run" shows an amber lock banner when the
  question is unsaved (`!questionId`) explaining that generators/tests/validation
  unlock after the first save; the sidebar step 3 shows a lock icon instead of a
  status dot in that state.

### `src/app/(org)/org/contests/[id]/page.tsx`

- **U5 — default statement removed.** New questions no longer seed `description`
  with the full Maximum-Subarray template (Unsplash stock image + an inline-JS
  `<code>` widget that DOMPurify kills on the student side — see C2). Defaults are
  now empty; placeholders guide instead.
- **U6 — save-time validation.** Points must be ≥ 1 (code/interactive/markov);
  every follow-up part must have ≥ 1 point. Previously `0`/`NaN` passed straight to
  the API.
- **U7 — question type selector.** Replaced hardcoded inline styles with
  design-system Tailwind classes (+`aria-pressed`), added a one-line explanation of
  the currently selected type (`QUESTION_TYPE_META`), and centralized type
  normalization in `normalizeQuestionType()`.
- **U8 — type-change warning.** Editing an existing question and switching its type
  shows an amber "grading configuration may no longer apply" warning (UI mitigation
  for audit item C6).
- **U9 — two-step delete.** Trash icon now arms a "Confirm delete?" button
  (auto-disarms after 4 s) instead of deleting on first click; shows "Deleting…"
  while in flight.
- **U10 — visible save/delete feedback.** `QuestionsTab` shows a transient
  (4 s) success banner — "Question created/updated successfully." / "Question
  deleted." The old in-form success message was unmounted before it could render.
- **U11 — single editor open.** Clicking Edit closes the Add form (and disarms any
  pending delete); previously both forms could be open at once, doubling the
  page-widening side effect.
- **U12 — informative question cards.** Cards now show the question type badge and,
  for judged types, `time_limit_ms · memory_limit_mb`; follow-up cards show part
  count instead of leaking their raw JSON `description` into the preview line.
  Removed the legacy (always-irrelevant for CP) HTML/CSS/JS badges.
- **U13 — sticky save bar.** Save/Cancel + the procedure hint ("Save question first,
  then upload tests and run validation") are pinned to the bottom of the viewport
  while the form is open, instead of hiding below the ~60vh studio.
- **U14 — dirty-cancel guard.** Cancel confirms before discarding: any typed content
  on a new question; a changed title on an existing one (description is re-composed
  by the studio, so it is deliberately excluded from the dirty check to avoid false
  positives).
- **U15 — actionable empty state.** "No questions yet" now lists the supported
  types and includes an "Add your first question" button.

### Explicitly NOT changed (per scope)

- No API route, payload field, or save-ordering change. All §2 items (C1–C9) remain
  open for the connection audit — **C1 (follow-up answer leakage) should be checked
  first.**
- `AccessSoftware` (student runtime) untouched.
