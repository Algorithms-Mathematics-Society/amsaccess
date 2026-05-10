# System Design Checks

## 1. Scale Target

Target capacity: approximately 100,000 users.

Primary goals:

- prevent unnecessary database reads
- protect expensive endpoints
- keep public pages fast
- prevent spam/abuse
- avoid exposing private data
- fail gracefully during traffic spikes

---

## 2. Architecture Summary

Frontend:

- Framework:
- Hosting:
- CDN:
- Auth:
- Database:
- Storage:
- Email/notifications:
- External APIs:

Important routes:

- Public:
- Authenticated:
- Admin:
- API routes:

---

## 3. Public vs Private Data

### Public data

Can be cached:

- landing page
- event information
- FAQs
- public rules
- public sponsors/partners
- static assets

Caching policy:

- CDN/browser caching allowed
- stale-while-revalidate allowed
- no sensitive user data

### Private data

Must not be publicly cached:

- user profiles
- registrations
- resumes/files
- admin dashboards
- payment/sponsorship data
- internal analytics

Caching policy:

- `Cache-Control: no-store`
- server-side auth checks required

---

## 4. Caching Strategy

### Static pages

Checklist:

- [ ] Landing page statically generated or cached
- [ ] Static assets optimized
- [ ] Images optimized
- [ ] Fonts optimized
- [ ] Public content revalidated safely

### API caching

Checklist:

- [ ] Public GET APIs use cache headers
- [ ] Private APIs use `no-store`
- [ ] No user-specific data in CDN cache
- [ ] Repeated database reads minimized
- [ ] Expensive computations cached where safe

---

## 5. Rate Limiting Strategy

Endpoints requiring rate limits:

- [ ] Login
- [ ] Signup
- [ ] Registration form
- [ ] Contact form
- [ ] Email sending
- [ ] File upload
- [ ] Admin actions
- [ ] Expensive public APIs

Rate limit keys:

- IP address
- user ID where available
- endpoint name

Recommended behavior:

- return HTTP 429
- show user-friendly error message
- log repeated abuse
- do not expose internal rate-limit details

---

## 6. Database Optimization

Checklist:

- [ ] No broad collection/table scans
- [ ] Pagination implemented
- [ ] Query limits added
- [ ] Indexes added where needed
- [ ] Composite indexes documented
- [ ] N+1 queries avoided
- [ ] Only required fields fetched
- [ ] User-specific reads protected by auth
- [ ] Admin reads protected by role checks

Firestore/Firebase-specific:

- [ ] Security rules reviewed
- [ ] Queries match indexes
- [ ] Client-side reads minimized
- [ ] Sensitive collections not readable publicly
- [ ] Resume/file metadata protected

---

## 7. File Upload / Resume Storage

Checklist:

- [ ] File type validation
- [ ] File size validation
- [ ] Auth required for upload
- [ ] Metadata stored separately
- [ ] Files are private by default
- [ ] Signed URLs used where needed
- [ ] Upload errors handled cleanly
- [ ] Backup/export strategy documented

Backup notes:

- Resume files should not rely only on one storage bucket.
- Periodic export or bucket replication should be considered.
- Critical metadata should be backed up separately from files.

---

## 8. Security Checklist

- [ ] Server-side validation on every form
- [ ] Auth checks on protected routes
- [ ] Admin role checks on admin routes
- [ ] Secrets not exposed to frontend
- [ ] Environment variables validated
- [ ] Inputs sanitized
- [ ] XSS-safe rendering
- [ ] CSRF protection where relevant
- [ ] Secure headers added
- [ ] Error messages do not leak internals
- [ ] Dependency vulnerabilities checked

---

## 9. Observability

Checklist:

- [ ] Error logging added
- [ ] Slow API logging added
- [ ] Health check endpoint exists
- [ ] Error boundaries added
- [ ] User-facing errors are clean
- [ ] Debug logs removed
- [ ] Critical failures are visible to maintainers

---

## 10. UX Under Load

Checklist:

- [ ] Submit buttons disable while pending
- [ ] Duplicate submissions prevented
- [ ] Loading states added
- [ ] Retry states added where useful
- [ ] 429 rate-limit errors shown clearly
- [ ] Upload failures handled clearly
- [ ] App does not crash on API failure

---

## 11. Performance Checklist

- [ ] Bundle size reviewed
- [ ] Heavy components lazy-loaded
- [ ] Images optimized
- [ ] Fonts optimized
- [ ] Unused dependencies removed
- [ ] Unnecessary client-side rendering reduced
- [ ] Expensive client-side computations avoided
- [ ] Lighthouse/performance pass completed

---

## 12. 100,000 User Readiness Checklist

- [ ] Public pages served mostly from cache/CDN
- [ ] Auth and form endpoints rate-limited
- [ ] Database reads minimized
- [ ] Database writes validated
- [ ] File uploads protected
- [ ] Admin routes protected
- [ ] Private data never publicly cached
- [ ] Error handling implemented
- [ ] Monitoring/logging exists
- [ ] Backup strategy documented

---

## 13. Known Limitations

Document current limitations here:
----------------------------------

---

## 14. Future Improvements

Recommended next steps:

- Redis-backed distributed rate limiting
- Queue-based email sending
- Object storage replication
- Scheduled database exports
- Load testing
- Admin analytics dashboard
- WAF/CDN rules
- Incident response runbook
