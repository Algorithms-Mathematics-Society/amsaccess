# Smooth Website System Design Playbook

This is a reusable checklist for building sites that feel fast, fluid, and reliable under real traffic. It is based on the patterns used in this project, but written generally so it can be applied to other websites.

## Core Principle

Smoothness is not one trick. It comes from separating critical work from decorative work, keeping the first render cheap, making APIs predictable, and avoiding background tasks that quietly steal the frame budget.

Aim for:

- Fast first paint: show meaningful content before loading heavy effects.
- Stable layout: reserve space before async content arrives.
- Cheap animation: animate transforms, opacity, shaders, and compositor layers instead of layout, paint, or CPU-heavy filters.
- Predictable APIs: bound all external calls with timeouts and avoid serial round trips.
- Clear caching: cache public read-heavy data, never cache private or mutating APIs.
- Defensive limits: rate-limit abuse without punishing legitimate users on shared networks.

## High-Level Architecture

Use a split architecture:

- Static or pre-rendered public pages for marketing/content routes.
- Client-only dynamic components for heavy browser-only visuals.
- Server API routes for secrets, validation, writes, uploads, and third-party calls.
- Database transactions for uniqueness, counters, and race-sensitive writes.
- CDN edge caching for public read-only endpoints.
- No-store headers for auth pages and sensitive APIs.

Good route classes:

| Route Type | Example | Cache Strategy |

| --- | --- | --- |

| Public static pages | `/`, `/about`, `/rules` | CDN cache with `s-maxage` and `stale-while-revalidate` |

| Public small dynamic data | `/api/count`, `/api/stats` | Short CDN TTL, stale fallback |

| Auth dashboards | `/admin`, `/firm` | `no-cache, no-store, must-revalidate` |

| Mutating APIs | `/api/submit`, `/api/upload` | `no-store` |

| Immutable build assets | `/_next/static/*` | Long immutable cache |

| Public assets | images, icons, PDFs | Long TTL, `stale-while-revalidate` |

## Frontend Smoothness

### Keep Initial Render Light

The first screen should render useful HTML and CSS immediately. Heavy visuals, analytics, dashboards, chart libraries, and decorative overlays should load later.

Use:

- Dynamic imports for below-the-fold sections.

-`ssr: false` only for browser-only components such as WebGL, maps, editors, or canvas.

-`requestIdleCallback` for non-critical imports such as analytics, speed insights, and decorative effects.

- Small loading placeholders with stable `min-height` to prevent layout shift.
- Font preloading only for the actual LCP font.

Pattern:

```js

constHeavyVisual = dynamic(

  () =>newPromise((resolve) => {

constload = () =>import('./HeavyVisual').then(resolve);

if (typeofwindow === 'undefined') returnload();

if ('requestIdleCallback'inwindow) {

requestIdleCallback(load, { timeout:2000 });

    } else {

setTimeout(load, 200);

    }

  }),

  { ssr:false, loading: () =>null }

);

```

### Isolate Re-Renders

Do not let high-frequency state updates re-render the whole page.

Use:

-`React.memo` for stable visual components.

- Small state islands for clocks, countdowns, search boxes, and form fields.

-`useMemo` for derived filter objects.

-`useRef` for mutable values that do not need to repaint.

- Debounced state for search/filter inputs.

Example rule: if something updates every second, it should not be a parent of WebGL, nav, large section lists, or expensive cards.

### Reveal Work Only When Needed

Use `IntersectionObserver` for scroll-triggered reveals and work activation.

Good uses:

- Fade in sections when close to viewport.
- Pause hero animation when scrolled away.
- Lazy-load charts, tables, maps, and media below the fold.

Avoid scroll handlers for this. Browser observers are cheaper and easier to throttle internally.

### Respect Motion Preferences

Always support `prefers-reduced-motion`.

For reduced motion:

- Skip WebGL/canvas animation entirely if it is decorative.
- Remove long transitions.
- Keep a static fallback that still looks intentional.

## Animation And WebGL Budget

Animation is smooth when it stays within the browser's 16.67ms frame budget at 60fps. On mobile, assume the real budget is smaller.

### Defer Heavy Animation

Render a static fallback immediately, then initialize animation during idle time. This prevents WebGL, canvas, or large JS libraries from competing with hydration and first paint.

### Pause Aggressively

Animation loops should stop when they are not visible.

Use:

- Page Visibility API: pause when the tab is hidden.

-`IntersectionObserver`: pause when the component leaves the viewport.

- Cleanup on unmount: cancel `requestAnimationFrame`, remove listeners, disconnect observers, dispose GPU resources.

### Move Work To The GPU

For WebGL:

- Store stable geometry once.
- Update uniforms each frame instead of rewriting vertex buffers.
- Use vertex shaders for wave/motion effects.
- Throttle buffer updates for particles or minor effects.
- Lower particle counts and device pixel ratio on mobile.
- Use `powerPreference: 'high-performance'` when suitable.

For CSS:

- Prefer `transform` and `opacity`.
- Avoid animating layout properties such as `top`, `left`, `width`, `height`, `margin`, or `filter`.
- Avoid CSS `filter`, blur, drop-shadow, and `mix-blend-mode` on elements that repaint every frame, especially canvas.
- Use static pseudo-elements for glows/vignettes instead of per-frame filters.
- Use `contain` where a component is visually isolated.

### Resize Without Jank

Use `ResizeObserver` on the component container instead of global `window.resize`. Debounce resize work and ignore mobile URL-bar height noise when width is unchanged.

## CSS And Layout Rules

Smooth sites feel stable because layout does not jump.

Use:

-`box-sizing: border-box`.

- Explicit aspect ratios or `min-height` for async sections.

-`100svh` or carefully chosen viewport units for mobile hero sections.

-`overflow-x: hidden` only at the document boundary, not as a layout crutch.

-`font-display: swap` or `optional`.

- Stable button/card dimensions.
- Hover effects only inside `@media (hover: hover)`.

-`focus-visible` styles for keyboard users.

Avoid:

- Nested cards that create unnecessary paint complexity.
- Huge shadows on animated elements.
- Layout-dependent animations.
- Dynamic text that changes container size every tick.

## API Latency Design

Fast APIs are not only fast internally. They are bounded, parallel, cache-aware, and resilient when dependencies fail.

### Parallelize Independent Work

Do independent I/O at the same time.

Good examples:

- Fetch count, duplicate checks, and options in parallel.
- Upload multiple files in parallel.
- Run gate checks while uploads are in progress if rejection is rare.
- Fetch dashboard stats and list data together.

Pattern:

```js

const [profile, stats, settings] = awaitPromise.all([

getProfile(),

getStats(),

getSettings(),

]);

```

### Bound External Calls

Every third-party API call should have a timeout. Slow dependencies should not freeze the user flow.

Pattern:

```js

constcontroller = newAbortController();

consttimeoutId = setTimeout(() =>controller.abort(), 2000);


try {

constres = awaitfetch(url, { signal:controller.signal });

returnawaitres.json();

} finally {

clearTimeout(timeoutId);

}

```

Choose fail behavior intentionally:

- Fail closed for security checks, payments, permissions, and destructive operations.
- Fail open for non-critical enrichment, optional verification, analytics, and stats.
- Serve stale data for public counters and dashboards when freshness is not critical.

### Avoid Serial Round Trips

For user flows, count round trips like they are expensive.

Good registration-style flow:

1. Client validates fields immediately.
2. Client uploads files and checks availability concurrently.
3. Server validates everything again.
4. Server writes core transaction first.
5. Server runs non-critical updates afterward with short timeouts.

### Make Writes Atomic

Use transactions when duplicate checks and writes must be race-free.

Good pattern:

- Use the normalized primary identifier as the document ID.
- Use sentinel documents for secondary uniqueness, such as usernames or handles.
- In one transaction, read both docs and write both docs.
- Return conflict errors without doing partial writes.

### Avoid Hot Documents

Do not increment a single global counter on every hot-path write unless your database supports the throughput.

Better:

- Use aggregate count queries for occasional reads.
- Use sharded counters for high-frequency increments.
- Store per-institution or per-segment counters if useful.
- Let the core write succeed even if non-critical stats updates fail.

## Caching Strategy

Use layered caching:

- Browser/session cache for navigation-local data.
- CDN cache for public read-only endpoints.
- In-memory serverless cache for short-lived hot values.
- Database aggregate queries instead of full scans.
- Stale fallback when the fresh read fails.

Recommended TTLs:

| Data | TTL |

| --- | --- |

| Public landing page | 6h CDN, 24h stale |

| Mostly static info pages | 24h CDN, 7d stale |

| Public count/stat endpoint | 60s CDN, 2-5m stale |

| Session-local count display | 60s sessionStorage |

| Auth pages | no-store |

| Mutations | no-store |

| Uploaded assets | long TTL if URLs are unique |

Headers:

```txt

Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=120

Cache-Control: no-store, max-age=0

Cache-Control: no-cache, no-store, must-revalidate

```

## Rate Limits

Rate limits should protect the system without blocking legitimate users on college WiFi, offices, cafes, or mobile carrier NATs.

### Use Multiple Keys

Do not rely only on IP. Use layered keys:

- IP hash for broad network abuse.
- Account/email/user ID hash for credential or form abuse.
- Resource key such as handle, username, file upload path, or invite code.
- Optional client ID only as a convenience key, never as a security boundary.

### Tune By Action

Example limits:

| Action | Suggested Limit | Behavior |

| --- | --- | --- |

| Login | 5 attempts / 15 min / IP | Hard block with `429` and `Retry-After` |

| Registration submit failures | 3 failures / 30 min / email and handle | Hard block |

| Registration IP attempts | 10 / hour / IP | Soft signal or combined-abuse check |

| Status checks | 10 / hour / IP or client key | Hard block |

| File uploads | 100 / hour / IP | Hard block to protect storage |

| Public counts | CDN cached | Avoid per-user rate limit unless abused |

### Count Failures Carefully

For forms, consider counting failed attempts rather than successful submissions. Successful submissions are terminal, and counting them can punish shared NAT users.

For login, count every attempt before auth. For uploads, count before parsing the body to avoid expensive work.

### Add Expiry

Store rate-limit timestamps with a TTL field so the database cleans them up automatically.

### Return Useful 429s

Include:

- Clear error message.

-`retryAfter` seconds when possible.

- No sensitive detail about which identifier triggered the block.

## Upload Design

For user uploads:

- Proxy uploads through a server route if you need strict validation or private credentials.
- Disable default body parser for multipart routes.
- Rate-limit before parsing body.
- Enforce max size at parser level and again after parse.
- Check MIME type and magic bytes.
- Sanitize file path segments.
- Add a random UUID to storage paths.
- Store only safe public metadata.
- Delete temp files in `finally`.
- Return stable file URL and original display name.

For large files, consider direct-to-storage signed URLs, resumable uploads, and background virus scanning.

## Forms And Perceived Latency

The smoothest form is the one that never surprises the user.

Use:

- Client validation for instant feedback.
- Server validation as the source of truth.
- Debounced validation for typing fields.
- Synchronous double-submit guard with `useRef`.
- Field-level server errors where possible.
- Request timeouts with human error messages.
- Optimistic UI only when reversal is safe.

-`scrollIntoView` to the first error on submit.

Avoid:

- Calling the server on every keystroke.
- Blocking initial render on counts or availability checks.
- Letting a button double-submit before React state updates.

## Dashboard Smoothness

Admin and data-heavy pages need a different style of smoothness: they should feel predictable under large datasets.

Use:

- Cursor pagination.
- Page size around 50 for interactive tables.
- Fetch `pageSize + 1` to detect `hasMore`.
- Debounced search.
- Abort in-flight fetches when filters change.
- Cache auth tokens briefly to avoid repeated async token calls.
- Poll low-priority stats slowly, such as every 5 minutes.
- Skip polling when `document.hidden`.
- Push selective filters to the database and apply remaining filters in bounded scans.
- Export in batches, not through one giant read when data grows.

## Observability

You cannot optimize what you cannot see.

Track:

- Request IDs.
- Workflow and event names.
- Actor or entity IDs, hashed/masked when sensitive.
- Duration in milliseconds.
- Cache hits/misses.
- Rate-limit decisions.
- Degraded paths and stale fallbacks.
- External dependency timeouts.

Use structured JSON logs on the server. Mask emails and secrets. Keep production stack traces short.

On the client:

- Use performance logging in development.
- Add real-user monitoring such as Web Vitals, Vercel Speed Insights, or an equivalent.
- Load analytics during idle time so measurement does not damage the metric it measures.

## Security Headers

Smoothness should not come at the cost of safety.

Use:

-`X-DNS-Prefetch-Control: on`

-`X-Content-Type-Options: nosniff`

-`X-Frame-Options: DENY`

-`Referrer-Policy: strict-origin-when-cross-origin`

- Route-specific Content Security Policy
- Tight `connect-src` per route

-`noindex,nofollow` for sensitive forms

- Origin checks for multipart upload endpoints

## Practical Checklist

Before launch:

- [ ] Landing page renders useful content without JS-heavy decorations.
- [ ] Heavy libraries are dynamically imported.
- [ ] Analytics and non-critical scripts load on idle.
- [ ] WebGL/canvas pauses when hidden or offscreen.
- [ ] Animations use transform, opacity, or GPU shader uniforms.
- [ ] Reduced-motion users get a static fallback.
- [ ] Images use AVIF/WebP where possible.
- [ ] Fonts are subsetted, limited by weight, and use `swap` or `optional`.
- [ ] Public pages and public read APIs have CDN cache headers.
- [ ] Private pages and mutating APIs use `no-store`.
- [ ] External APIs have timeouts.
- [ ] Independent API calls run in parallel.
- [ ] Critical writes use transactions.
- [ ] Hot counters are avoided or sharded.
- [ ] Rate limits are action-specific and TTL-backed.
- [ ] File uploads validate size, MIME, magic bytes, origin, and path safety.
- [ ] Dashboards paginate and abort stale fetches.
- [ ] Logs are structured and sensitive data is masked.

## Default Targets

Use these as starting targets:

- First Contentful Paint: under 1.8s on slow mobile.
- Largest Contentful Paint: under 2.5s.
- Interaction to Next Paint: under 200ms.
- Cumulative Layout Shift: under 0.1.
- API p95 for normal reads: under 500ms.
- API p95 for writes: under 1500ms, excluding large uploads.
- External dependency timeout: 2-10s depending on importance.
- Public counter freshness: 60s is usually enough.

## The Reusable Mental Model

Every feature should be classified into one of four buckets:

1. Critical path: needed for first render or successful user action. Make it small and reliable.
2. Important but deferrable: load after paint or after idle.
3. Nice-to-have: fail open, timeout quickly, never block success.
4. Background: batch, cache, poll slowly, and stop when hidden.

If the site feels smooth, it is usually because most work has been moved out of bucket 1.
