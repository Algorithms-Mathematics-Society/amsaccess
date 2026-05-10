# AMS Access

AMS Access is a Next.js and Supabase platform for managing serious written assessment rounds. The web app provides a marketing site plus admin tools for session review, candidate submissions, integrity events, risk scores, reusable questions, rubrics, and assessment management.

The product is built for reasoning-heavy exams where the written derivation matters as much as the final answer.  .

## What It Does

- Presents the public AMS Access product site.
- Calculates a risk score from integrity events for review prioritization.
- Provides an admin dashboard for sessions, submissions, event counts, risk tone, and review status.
- Provides a CMS-style question bank with reusable questions, versions, tags, rubrics, expected outputs, and uploaded assets.
- Lets admins build assessments by assigning published questions in a chosen order.
- Stores reviewer scores, decisions, comments, and rubric-level scoring.

Integrity events are review signals only. They do not prove misconduct and should not be used as automatic disqualification decisions.

## Tech Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, Row Level Security, and Storage
- `@supabase/ssr` and `@supabase/supabase-js`
- `lucide-react` icons

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/access-admin-only` | Admin sign-in page |
| `/admin` | Admin session dashboard |
| `/admin/session/[sessionId]` | Candidate submission review page |
| `/admin/questions` | Question bank |
| `/admin/questions/new` | Create a question |
| `/admin/questions/[id]/edit` | Edit or version a question |
| `/admin/assessments` | Assessment manager |
| `/admin/assessments/new` | Create an assessment |
| `/admin/assessments/[id]/edit` | Edit an assessment and assign questions |

Admin routes are protected by `src/middleware.ts`. A signed-in Supabase user can access `/admin/*` only when they have an active row in `public.admin_users`.

## Project Structure

```text
src/app/
  (marketing)/                     Public product, pricing, docs, and contact pages
  (admin)/                         Admin login, dashboards, CMS, and review pages
  (org)/                           Organization setup, login, dashboard, and contests
  api/                             Route handlers grouped by public/admin/org/auth areas

src/components/
  EventTimeline.tsx                Integrity event display
  MarkdownPreview.tsx              Prompt rendering

src/domain/
  cms.ts                           CMS constants and helpers
  risk.ts                          Event weights and risk tone helpers
  types.ts                         Shared TypeScript data types

src/lib/
  client/                          Browser API and Supabase clients
  server/                          Server env, auth, logging, rate limiting, and HTTP helpers

src/integrations/payments/
  provider.ts                      Provider-neutral future payment integration shell

docs/
  product/                         Product, brand, pricing, copy, and website notes
  engineering/                     Production-readiness and system design notes

scripts/
  update_page.py
  update_pages.py

supabase/migrations/
  202605060001_initial_schema.sql
  202605060002_rls_and_event_types.sql
  202605060003_admin_auth.sql
  202605060004_admin_users.sql
  202605060005_cms_mvp.sql
  202605080006_organizations.sql
  202605110001_system_hardening_indexes.sql
```

## Requirements

- Node.js 20 or newer
- npm
- A Supabase project

The repository uses `package-lock.json`, so prefer `npm ci` for reproducible installs.

## Environment

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Only the public Supabase URL and anon key are used by the app. Do not add a service role key to the frontend environment.

## Supabase Setup

Create a Supabase project, then run the SQL migrations in order:

1. `supabase/migrations/202605060001_initial_schema.sql`
2. `supabase/migrations/202605060002_rls_and_event_types.sql`
3. `supabase/migrations/202605060003_admin_auth.sql`
4. `supabase/migrations/202605060004_admin_users.sql`
5. `supabase/migrations/202605060005_cms_mvp.sql`

You can run them with the Supabase CLI, or paste them into the Supabase SQL editor one at a time.

The migrations create:

- `assessments`
- `questions`
- `assessment_questions`
- `question_assets`
- `sessions`
- `answers`
- `proctor_events`
- `reviews`
- `admin_users`
- `question-assets` storage bucket
- RLS policies for candidates, admins, question assets, and assessment CMS data
- Risk score trigger logic for `sessions.risk_score`

The initial migration also seeds a sample assessment and sample written questions.

## Create an Admin User

Admins sign in through Supabase Auth, but authorization is controlled by `public.admin_users`.

1. In Supabase, go to Authentication -> Users.
2. Create a user with an email and password.
3. Run this SQL, replacing the email:

```sql
insert into public.admin_users (user_id, email)
select id, email
from auth.users
where email = 'admin@yourdomain.com'
on conflict (user_id) do update
set email = excluded.email,
    is_active = true;
```

To revoke admin access:

```sql
update public.admin_users
set is_active = false
where email = 'admin@yourdomain.com';
```

Then visit `/access-admin-only` and sign in.

## Local Development

Install dependencies:

```bash
npm ci
```

Start the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Build for production:

```bash
npm run build
```

Run lint:

```bash
npm run lint
```

## Candidate Flow

Candidate assessment delivery happens in the AMS Access desktop app. The website no longer hosts the browser assessment workspace.

## Admin Flow

1. Admin signs in at `/access-admin-only`.
2. Middleware verifies the Supabase Auth user and checks `public.admin_users`.
3. Admin opens `/admin` to see sessions, submission status, risk scores, event counts, and review links.
4. Admin can open a session to review answers, event timeline, expected outputs, assets, rubrics, score, decision, and comments.
5. Admin can manage reusable questions in the question bank.
6. Admin can create and edit assessments, then assign published questions to each assessment.

## Content Management

Questions are reusable across assessments through `assessment_questions`. A question includes:

- short code
- type
- difficulty
- tags
- markdown-like statement
- expected output
- rubric criteria
- max score
- behavior flags such as final answer, explanation, diagrams, code, assumptions, and multiple methods
- status: `DRAFT` or `PUBLISHED`
- version and change notes
- optional uploaded assets in the `question-assets` bucket

When a live-linked question is edited, the admin UI creates a new version rather than mutating the live question in place.

Assessments include:

- title and slug
- description
- status: `DRAFT`, `SCHEDULED`, `LIVE`, or `CLOSED`
- start and end times
- duration
- candidate instructions and rules
- allowed browsers and devices
- active/archive state
- ordered question assignments

## Integrity Signals

Integrity events are recorded by the assessment runtime and reviewed in the admin console, including:

- fullscreen enter and exit
- tab hidden and visible
- window blur and focus
- copy, cut, and paste attempts
- context menu attempts
- blocked keyboard shortcuts
- suspected DevTools usage
- mouse leaving and returning to the viewport
- idle thresholds
- offline and online changes
- print attempts
- typing and answer-length spikes
- submission lifecycle events

Risk scores are capped at 100. The UI groups scores into:

- `Low`: 0-19
- `Moderate`: 20-39
- `High`: 40-74
- `Critical`: 75-100

These signals can be noisy. Reviewers should read the event timeline beside the candidate's answers and make human decisions.

## Security Model

- Candidates do not use Supabase Auth.
- Candidate sessions are reviewed in admin by session UUID.
- Public web routes do not host the candidate assessment workspace.
- Admin users must authenticate with Supabase Auth and must have an active `public.admin_users` row.
- Admin CMS, review, and storage operations use `public.is_admin()` in RLS policies.
- The `question-assets` storage bucket is public for reads so candidates and reviewers can load prompt assets.
- The frontend uses only the Supabase anon key.

For a high-stakes production deployment, consider adding server-side session tokens, stricter candidate ownership validation, rate limiting, audit logging for admin actions, and a non-public asset delivery strategy.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build the production app |
| `npm run start` | Start the production server after a build |
| `npm run lint` | Run Next.js linting |

## Deployment

The app can be deployed anywhere Next.js 14 is supported, including Vercel.

Before deploying:

1. Run all Supabase migrations in production.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the hosting provider.
3. Create at least one Supabase Auth user.
4. Add that user to `public.admin_users`.
5. Create or publish a live assessment with assigned published questions.
6. Smoke test `/`, `/access-admin-only`, and `/admin`.

## Troubleshooting

### "Supabase is not configured"

Check that `.env.local` exists and contains valid values for:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Restart the dev server after changing environment variables.

### Admin login works but redirects back to login

The Auth user probably does not have an active row in `public.admin_users`. Run the admin insert SQL again and verify `is_active = true`.

### No active assessment is configured

Confirm the assessment has:

- `is_active = true`
- `archived_at is null`
- `status` set to `LIVE` or `SCHEDULED`
- a start/end window that includes the current time, or null dates
- at least one assigned published question

### Desktop app sees no questions

Confirm the assessment has rows in `assessment_questions` and the assigned questions have `status = 'PUBLISHED'`.

### Asset uploads fail

Confirm the `question-assets` bucket exists and the storage policies from `202605060005_cms_mvp.sql` were applied.

## Notes

Browser-based integrity logging is inherently limited. Users can switch devices, disable scripts, lose network, or trigger events accidentally. AMS Access records useful context for review, but the final judgment should remain human-led.
