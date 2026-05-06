# AMS Derive Assessment Platform

Minimal Next.js 14 + TypeScript + Tailwind assessment MVP with Supabase persistence and browser integrity event logging.

## Run

```bash
npm install
npm run dev
```

Create a Supabase project, run `supabase/migrations/202605060001_initial_schema.sql` in the SQL editor, then copy `.env.example` to `.env.local` and fill in your public Supabase URL and anon key.

Browser proctoring is not foolproof. This MVP records integrity signals and a simple risk score for review; it does not prove misconduct.
