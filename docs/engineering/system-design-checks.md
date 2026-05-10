# System Design Checks

## Architecture Summary

- Framework: Next.js 14 App Router with mostly static marketing pages and protected admin/org portals.
- Auth: Supabase Auth through SSR/browser cookies. Admin access is checked against `public.admin_users`; org access uses Supabase RLS on organization tables.
- Database/storage: Supabase Postgres plus Supabase Storage bucket `question-assets`.
- API layer: protected high-traffic flows now use Next route handlers under `/api/*` with `no-store`, server-side validation, structured logging, and temporary in-memory rate limits.
- Public pages: `/`, `/product`, `/pricing`, `/download`, `/docs`, `/changelog`, `/contact`, `/controlled-round`.
- Private pages/data: `/admin/*`, `/org/*`, auth state, sessions, answers, reviews, org contests, invites, and question/admin mutations.

## Public vs Private Routes

Public/cacheable:

- Marketing pages and static assets.
- Cache policy: `public, max-age=300, s-maxage=86400, stale-while-revalidate=604800`.
- Immutable static asset policy: `public, max-age=31536000, immutable`.

Private/no-store:

- `/access-admin-only`, `/admin/*`, `/org/*`, and protected `/api/*` routes.
- Admin/org APIs return `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`.
- User/org/session/invite/review data must never be CDN cached.

## Caching And Rate Limiting

- Public page and asset cache headers are configured in `next.config.mjs`.
- Middleware adds `no-store` to protected page shells and auth pages.
- API helpers enforce `no-store` for private JSON responses.
- Temporary in-memory rate limiting is implemented for:
  - auth: 5/minute and 20/hour per IP/email/scope
  - contact: 6/10 minutes per IP
  - private reads: 120/minute per IP/route
  - admin/org writes: 30/minute per IP/action
  - image uploads: 5/10 minutes per IP/question
- Known limitation: in-memory limits are per Node process and reset on deploy/restart. Add Redis/Upstash before multi-instance production traffic.

## Database And Query Optimization

- Admin session dashboard uses paginated server reads instead of loading all sessions and all events in the browser.
- Admin session detail loads only one session, bounded answers, bounded events, related questions, assets, and review data.
- Org dashboard avoids N+1 count queries by loading bounded contest IDs and grouping invite/question counts server-side.
- Contest detail loads bounded questions and invites through server APIs.
- Added migration `202605110001_system_hardening_indexes.sql` for session sorting/search, event summaries, admin CMS lists, contest dashboards, invite lookups, and asset lookups.
- Remaining future optimization: replace server-side grouped counts with database RPC/view aggregates if contests regularly exceed the current bounded limits.

## Security Checklist

- Server-side auth/admin/org checks exist for high-impact APIs.
- Secure headers are configured: CSP, frame protection, referrer policy, content type options, and permissions policy.
- Environment validation checks required Supabase public vars.
- Auth and mutation endpoints are rate limited.
- Markdown preview now rejects unsafe image URLs and escapes image attributes.
- Existing question image uploads are server-mediated, admin-only, type-limited, and size-limited to 5 MB.
- Contact API validates and rate limits payloads, but does not fake delivery while no email provider is configured.
- Payment gateway work is not implemented; future payment webhooks must use signature verification, idempotency, server-only secrets, and no public caching.

## Observability And Failure Handling

- API routes use structured JSON logs and slow API logging controlled by `SLOW_API_MS` (default 750 ms).
- `/api/health` reports safe service/env status without exposing secrets.
- App-level and global error boundaries provide graceful retry surfaces.
- API errors return consistent JSON and user-friendly 429 messages.

## 100,000 User Readiness

- Public traffic is served mostly from static output/CDN cache.
- Login and protected mutations have temporary rate limits.
- High-traffic admin/org dashboards avoid broad browser-side reads.
- Private responses use `no-store`.
- Database indexes support common dashboard filters and sorts.
- Current deployment still needs distributed rate limiting before horizontal scale.

## Known Limitations

- Redis/Upstash is intentionally deferred; in-memory rate limits are not distributed.
- Some lower-traffic admin CMS forms still use the Supabase browser client for reads/writes and rely on RLS plus middleware. Move them behind server APIs before exposing heavy admin usage.
- Contact delivery is not configured; the endpoint validates/rate-limits but returns a clear unavailable response.
- Supabase backups, retention policies, and object storage replication should be configured outside this codebase.

## Future Improvements

- Add Redis/Upstash for distributed rate limiting.
- Add a real contact delivery provider or CRM integration.
- Add database RPC/views for dashboard aggregate counts.
- Add payment gateway hardening when payments are introduced.
- Add scheduled Supabase exports and storage replication.
- Add production monitoring such as Sentry, Logtail, or the hosting provider's log drain.
