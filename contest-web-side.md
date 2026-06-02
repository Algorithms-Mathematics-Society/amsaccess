# Contest Web Side — Org Portal Deep Dive

Covers everything on the **organization (admin) side** of contests: creation, configuration, language support, API surface, timing, and invitations.

---

## 1. Contest Creation

**Page:** `src/app/(org)/org/contests/new/page.tsx`

### Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Title | text input | Yes | — |
| Description | textarea | No | Optional |
| Contest Type | radio | Yes | `CP` or `CHESS`; defaults to `CP` |
| Scoring Type | radio | CP only | `IOI`, `ICPC`, or `CF`; hidden for CHESS |
| Allowed Languages | multi-select | CP only | See §2; hidden for CHESS |
| Plugin Config | JSON textarea | CHESS only | Raw JSON validated via `JSON.parse()` |

### Defaults on Mount

- `start_at` = current time + 1 hour
- `end_at` = current time + 1 hour (same as start — org adjusts)
- `scoring_type` = `"ICPC"`
- `allowed_languages` = `["C++17", "Python3", "Java17"]`
- `plugin_type` = `"CP"`

### Contest Type Side Effects

When contest type is **CHESS**:
- `scoring_type` is forced to `"ICPC"` (line 44)
- `allowed_languages` is forced to `["C++17"]` (line 45)
- Plugin config JSON textarea appears

### Validation

- Plugin config must be valid JSON; error shown inline if parse fails
- No client-side title length enforcement (server may enforce)
- `end_at > start_at` checked only in the **Settings tab** on the detail page (line 1339)

### API Call

```
POST /api/org/contests
```

Payload:
```json
{
  "title": "My Contest",
  "description": "Optional",
  "start_at": "2025-06-02T16:00:00.000Z",
  "end_at": "2025-06-02T18:00:00.000Z",
  "timezone": "America/New_York",
  "status": "DRAFT",
  "scoring_type": "ICPC",
  "allowed_languages": ["C++17", "Python3", "Java17"],
  "plugin_type": "CP",
  "plugin_config": null
}
```

On success → redirect to `/org/contests/{newId}`.

---

## 2. Allowed Languages

**File:** `src/app/(org)/org/contests/new/page.tsx` lines 172–197  
**Settings mirror:** `src/app/(org)/org/contests/[id]/page.tsx` lines 1456–1479

### Available Options

| Language | Default Selected |
|----------|-----------------|
| C++17 | Yes |
| Python3 | Yes |
| Java17 | Yes |
| Go | No |
| Rust | No |

### Toggle Logic

Clicking a language button adds it if absent or removes it if present from the `allowedLanguages` array. At least one must remain (no server guard — org is trusted to not send an empty array).

### CHESS Override

CHESS contests bypass the multi-select entirely and always send `["C++17"]` regardless of what the org had selected.

### Where Languages Travel

1. Stored in the contest DB record as a string array
2. Returned in `GET /api/org/contests/{id}` response
3. Sent to the judge when a submission is evaluated to confirm the language is permitted
4. Displayed in the **Settings tab** for editing post-creation

---

## 3. Contest Data Types

**File:** `src/app/(org)/org/contests/[id]/page.tsx` lines 15–69

```typescript
type Contest = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;      // ISO 8601
  end_at: string;        // ISO 8601
  timezone?: string;     // IANA timezone, e.g. "America/New_York"
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED";
  org_id: string;
  scoring_type: "IOI" | "ICPC" | "CF";
  allowed_languages: string[];
  plugin_type?: "CP" | "CHESS";
  plugin_config?: string;  // JSON string
};

type Question = {
  id: string;
  contest_id: string;
  title: string;
  description: string;
  html_starter: string;
  css_starter: string;
  js_starter: string;
  points: number;
  order_index: number;
  question_type: "code" | "interactive";
  time_limit_ms: number;     // min 100ms
  memory_limit_mb: number;   // min 16MB
  checker_type?: "token" | "custom";
  checker_code?: string;
  validator_code?: string;
  model_solution?: string;
  model_lang?: string;
  generator_script?: string;
};

type Invite = {
  id: string;
  email: string;
  status: "pending" | "accepted";
  created_at: string;
};

type JudgeCapacity = {
  mig_name: string;
  region: string;
  mode?: "AUTO" | "MANUAL_ON" | "MANUAL_OFF";
  target_size: number;
  is_stable: boolean;
  ready?: boolean;
  phase?: "starting" | "ready" | "stopping" | "stopped" | "unknown";
  total_instances?: number;
  running_instances?: number;
  current_actions?: Record<string, number>;
};

type RuntimeStatus = {
  contest_id: string;
  runtime_status: "COLD" | "WARMING" | "READY" | "DEGRADED";
  runtime_ready: boolean;
  ready_checked_at?: string;
  failure_reason_code?: string;
  failure_reason?: string;
  capacity: JudgeCapacity;
};
```

---

## 4. Full API Surface — Org Contest Endpoints

### Contest CRUD

| Method | Endpoint | File | Purpose |
|--------|----------|------|---------|
| POST | `/api/org/contests` | `contests/route.ts` | Create new contest |
| GET | `/api/org/contests/{id}` | `contests/[id]/route.ts` L9–46 | Fetch contest + questions + invites |
| PATCH | `/api/org/contests/{id}` | `contests/[id]/route.ts` L48–74 | Update title, dates, status, languages |
| DELETE | `/api/org/contests/{id}` | `contests/[id]/route.ts` L76–95 | Delete contest entirely |

### Questions

| Method | Endpoint | File | Purpose |
|--------|----------|------|---------|
| POST | `/api/org/contests/{id}/questions` | `questions/route.ts` | Create question |
| GET | `/api/org/contests/{id}/questions/{qid}` | `questions/[qid]/route.ts` | Fetch question detail |
| PATCH | `/api/org/contests/{id}/questions/{qid}` | `questions/[qid]/route.ts` | Update question metadata |
| DELETE | `/api/org/contests/{id}/questions/{qid}` | `questions/[qid]/route.ts` L636–644 | Delete question |
| PUT | `/api/org/contests/{id}/questions/{qid}/cp-config` | `cp-config/route.ts` | Save validator + checker C++ code |
| GET/POST | `/api/org/contests/{id}/questions/{qid}/tests` | `tests/route.ts` | List / create test cases |
| POST | `/api/org/contests/{id}/questions/{qid}/tests/generate` | `tests/generate/route.ts` | AI-generate test cases |
| POST | `/api/org/contests/{id}/questions/{qid}/prejudge` | `prejudge/route.ts` | Validate model solution against tests |
| GET/POST | `/api/org/contests/{id}/questions/{qid}/generators` | `generators/route.ts` | List / create test generators |

### Invitations

| Method | Endpoint | File | Purpose |
|--------|----------|------|---------|
| POST | `/api/org/contests/{id}/invites` | `invites/route.ts` L10–94 | Create invites + send emails |
| DELETE | `/api/org/contests/{id}/invites/{inviteId}` | `invites/[inviteId]/route.ts` L9–32 | Remove an invite |

### Session Codes

| Method | Endpoint | File | Purpose |
|--------|----------|------|---------|
| GET | `/api/org/contests/{id}/session-codes` | `session-codes/route.ts` L9–23 | List active session codes |
| POST | `/api/org/contests/{id}/session-codes` | `session-codes/route.ts` L25–39 | Create session code (idempotent) |

### Live Monitoring

| Method | Endpoint | File | Purpose |
|--------|----------|------|---------|
| GET | `/api/org/contests/{id}/runtime-status` | `runtime-status/route.ts` L9–21 | Judge health + capacity |
| POST | `/api/org/contests/{id}/runtime-readiness/check` | `runtime-readiness/check/route.ts` | Trigger judge readiness check |
| GET | `/api/org/contests/{id}/live/submissions` | `live/submissions/route.ts` | Live submission feed |
| GET | `/api/org/contests/{id}/live/proctor-events` | `live/proctor-events/route.ts` | Proctoring violations |
| GET | `/api/org/contests/{id}/live/infra-events` | `live/infra-events/route.ts` | Infrastructure scaling events |

### Judge Cluster Control

| Method | Endpoint | File | Purpose |
|--------|----------|------|---------|
| GET | `/api/org/judge-capacity` | `judge-capacity/route.ts` L7–34 | Get current judge phase/instances |
| POST | `/api/org/judge-capacity/start` | `judge-capacity/start/route.ts` | Start judge cluster |
| POST | `/api/org/judge-capacity/stop` | `judge-capacity/stop/route.ts` | Stop judge cluster |

### Chess (plugin-specific)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/org/contests/{id}/chess/testplay/session` | Start chess testplay session |
| POST | `/api/org/contests/{id}/chess/testplay/move` | Submit a move in testplay |
| GET | `/api/org/contests/{id}/chess/testplay/state` | Get current board state |

---

## 5. Timing & Contest Timer

**File:** `src/app/(org)/org/contests/[id]/page.tsx`

### Time Storage

- `start_at` and `end_at` stored as **ISO 8601 UTC strings** in the DB
- `timezone` stores an IANA identifier (e.g., `"America/New_York"`) for display context
- The timezone field does **not** shift the stored UTC times — it is a display hint

### Datetime Conversion Helper

```typescript
// Lines 112–121
function toDateTimeLocalValue(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  // Returns "YYYY-MM-DDTHH:mm" in local browser time
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
```

Used to populate `<input type="datetime-local">` fields in the Settings tab.

### Settings Tab — Time Editing

- Lines 1400–1418: Two `datetime-local` inputs (start/end) + a text field for timezone
- On save (PATCH), the local values are converted back to ISO via `new Date(localValue).toISOString()`
- Validation: `end_at > start_at` enforced client-side before sending PATCH (line 1339)

### Org-Side Display

The contest header shows:

```
{new Date(contest.start_at).toLocaleString()} → {new Date(contest.end_at).toLocaleString()}
```

This is **static** — there is no countdown or live clock on the org dashboard page. The timing enforcement (allowing/blocking submissions by time) happens server-side and in the proctor/student-facing app, not in this org UI.

### Contest Status Lifecycle

| Status | Meaning |
|--------|---------|
| `DRAFT` | Not visible to students, can freely edit |
| `SCHEDULED` | Published, not yet started |
| `ACTIVE` | Running, submissions accepted |
| `ENDED` | Closed, no new submissions |

Status can be manually set from the Settings tab dropdown (line 1423–1434) in addition to any automatic time-based transitions the backend may perform.

---

## 6. Contest Invitations — Full Flow

**UI:** `InvitesTab` in `src/app/(org)/org/contests/[id]/page.tsx` lines 1062–1293  
**API:** `src/app/api/(org)/org/contests/[id]/invites/route.ts`

### Step 1 — Email Input Parsing

The org pastes emails into a textarea. The parser (lines 1125–1133) handles:

| Format | Example |
|--------|---------|
| Raw email | `alice@example.com` |
| Named format | `Alice Doe <alice@example.com>` |
| Comma-separated | `alice@example.com, bob@example.com` |
| Line-separated | One email per line |
| Mixed | Any combination of the above |

Invalid entries (no `@`) are silently filtered out.

### Step 2 — Email Template

Two template fields in the UI:
- **Subject** — defaults from org settings (`invite_subject_template`) or a hardcoded fallback
- **Body** — HTML/text template with placeholder tokens

**Template tokens** (replaced at send time, lines 96–102):

| Token | Replaced With |
|-------|--------------|
| `{{email}}` | Recipient's email address |
| `{{download_url}}` | `https://amsaccess.com/download` |
| `{{download_link}}` | Same as `{{download_url}}` |
| `{{contest_id}}` | Empty string (reserved) |
| `{{name}}` | Recipient name (preset templates) |
| `{{username}}` | Student username (preset templates) |
| `{{password}}` | Student password (preset templates) |
| `{{contestcode}}` | Session code (preset templates) |

**Two built-in presets** (lines 1589–1651):
1. **Standard Onboarding Invite** — Welcome + credentials + download link
2. **Final Warning / Pre-Assessment Alert** — Urgent reminder for students who haven't set up yet

### Step 3 — API Call

```
POST /api/org/contests/{id}/invites
```

```json
{
  "emails": ["alice@domain.com", "bob@domain.com"],
  "subject": "You are invited to the AMS Access contest",
  "body": "Hi {{email}}, download at {{download_url}}"
}
```

Rate-limited under category `"orgWrite"` with key `["contest-invites", contestId]`.

### Step 4 — Server Processing

1. **Normalize** emails (lowercase, trim)
2. **Check** `allow_bulk_invites` org setting — if false, bulk invite is blocked
3. **Read** org-level template defaults from DB (`invite_subject_template`, `invite_body_template`, `email_from_name`)
4. **Insert** invite records in the Go backend DB via internal API call
5. **Send emails** via Resend API (only if `RESEND_API_KEY` env var is set)
   - From: `process.env.RESEND_FROM_EMAIL` or `{fromName} <onboarding@resend.dev>`
   - One API call per recipient: `POST https://api.resend.com/emails`
   - Tracks `emailsSent` count in response

### Invite Status Display

Each invite row shows (lines 1229–1289):

- Email address
- Status badge: **pending** (amber) or **accepted** (green)
- Created-at date
- Delete (×) button

### Deleting an Invite

```
DELETE /api/org/contests/{id}/invites/{inviteId}
```

Removes from DB immediately; org sees the row disappear on next render.

### Session Codes

Session codes are distinct from invitations:

- Auto-created via `POST /api/org/contests/{id}/session-codes` (idempotent — calling twice returns the same code)
- Displayed in the Invites tab for the org to include in communications
- Students enter this code in the **proctor desktop app** to unlock the contest
- Listed via `GET /api/org/contests/{id}/session-codes`

---

## 7. Settings Tab — Full Editor

**Location:** `SettingsTab` function, lines 1296–1531

All fields editable post-creation:

| Field | Input Type | Constraint |
|-------|------------|------------|
| Title | text | — |
| Description | textarea | — |
| Start time | datetime-local | Must be < end_at |
| End time | datetime-local | Must be > start_at |
| Timezone | text | IANA string, e.g. `America/New_York` |
| Status | select | DRAFT / SCHEDULED / ACTIVE / ENDED |
| Scoring type | radio | IOI / ICPC / CF |
| Allowed languages | multi-toggle | C++17, Python3, Java17, Go, Rust |
| Contest mode | radio | CP / CHESS |
| Plugin config | JSON textarea | Validated before save |

**Save** → `PATCH /api/org/contests/{id}`  
**Delete** → `DELETE /api/org/contests/{id}` with a confirmation dialog

---

## 8. Live Monitoring Tab

**Location:** `LiveMonitorTab` function, lines 405–604

### Transport Strategy

1. **Primary:** Server-Sent Events (SSE) — long-lived connection, push from server
2. **Fallback:** Polling every 5 seconds if SSE fails or is unsupported

A badge in the UI shows `"LIVE STREAMED (SSE)"` or `"POLLING FALLBACK"` (lines 536–542).

### SSE Event Types

| Event | Endpoint | Data |
|-------|----------|------|
| `submission.updated` | `/live/submissions` | Candidate, verdict, runtime (ms), memory (MB) |
| `activity.event` | `/live/proctor-events` | Focus loss, clipboard, idle, network; severity INFO/WARN/CRITICAL |
| `infra.event` | `/live/infra-events` | Judge scaling, instance lifecycle |

### Runtime Readiness Button

- Button triggers `POST /api/org/contests/{id}/runtime-readiness/check`
- Backend validates judge cluster health and updates `runtime_status` to one of: `COLD`, `WARMING`, `READY`, `DEGRADED`

---

## 9. File Map

| Area | File |
|------|------|
| Contest creation form | `src/app/(org)/org/contests/new/page.tsx` |
| Contest detail + all tabs | `src/app/(org)/org/contests/[id]/page.tsx` |
| Create contest API | `src/app/api/(org)/org/contests/route.ts` |
| Contest CRUD API | `src/app/api/(org)/org/contests/[id]/route.ts` |
| Invites API | `src/app/api/(org)/org/contests/[id]/invites/route.ts` |
| Invite delete API | `src/app/api/(org)/org/contests/[id]/invites/[inviteId]/route.ts` |
| Session codes API | `src/app/api/(org)/org/contests/[id]/session-codes/route.ts` |
| Live submissions API | `src/app/api/(org)/org/contests/[id]/live/submissions/route.ts` |
| Proctor events API | `src/app/api/(org)/org/contests/[id]/live/proctor-events/route.ts` |
| Runtime status API | `src/app/api/(org)/org/contests/[id]/runtime-status/route.ts` |
| Readiness check API | `src/app/api/(org)/org/contests/[id]/runtime-readiness/check/route.ts` |
| Judge capacity API | `src/app/api/org/judge-capacity/route.ts` |
| Judge start/stop | `src/app/api/org/judge-capacity/{start,stop}/route.ts` |
| Questions CRUD | `src/app/api/(org)/org/contests/[id]/questions/route.ts` |
| CP config (validator/checker) | `src/app/api/(org)/org/contests/[id]/questions/[qid]/cp-config/route.ts` |
| Test case management | `src/app/api/(org)/org/contests/[id]/questions/[qid]/tests/route.ts` |
| Test generation | `src/app/api/(org)/org/contests/[id]/questions/[qid]/tests/generate/route.ts` |
| Chess testplay | `src/app/api/(org)/org/contests/[id]/chess/testplay/{session,move,state}/route.ts` |
| API client (fetch wrapper) | `src/lib/client/apiClient.ts` |
