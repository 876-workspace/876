# Phase 6 review handoff — external calendar synchronization

Branch: `feat/work-widget-phase-6`

Purpose: this is the starting file for a new implementation/review session. Read this file, then `plan.md`, `tracker.md`, root `CLAUDE.md`, and `.agents/rules/gpt-web-operating-rules.md` before changing code.

## Current branch state

At the time this handoff was written, Phase 6 source includes the provider-neutral sync foundation, Google/Microsoft/CalDAV adapters, credential sealing, per-calendar mapping/cursor state, OAuth/session Work routes, session SDK methods, and the Invoice same-origin calendar-sync BFF.

Recent Phase 6 commits include:

- `e878de1d1cc32accd46692af1cb941560878ffb8` — `feat(work): add external calendar provider adapters`
- `f8cd3d19a5f08fb4eab3d8111b5327a4ca16c896` — Work HTTP/session sync routes
- `fd4b3b99ecd27ed97c09c34de43dd92ccf188e9d` — `feat(work): add calendar sync session SDK`
- `e5d004c3edd01ee12a7226b3a7350046c11cba8f` — `feat(invoice): add safe calendar sync BFF`

Do not assume the branch head above is still current. Resolve the latest `feat/work-widget-phase-6` head before editing.

## Local orchestrator review — acceptance blockers

A local AI review was run after pulling Phase 6 to `fd4b3b99e`. It made **no file changes**. Treat all findings below as open until the current branch is re-reviewed and the exact issue is demonstrably fixed.

### Blocker — lockfile is stale

`apps/work-api/package.json` changed but `pnpm-lock.yaml` was not updated. Normal frozen-lockfile pnpm checks fail immediately with:

`ERR_PNPM_OUTDATED_LOCKFILE`

Required work:

- reconcile the Work API importer in `pnpm-lock.yaml` with `apps/work-api/package.json`;
- do not hand-edit package resolution entries unnecessarily;
- local orchestrator must run the normal pnpm lockfile/install validation after the source changes are complete.

### Blocker — Microsoft adapter TypeScript failure

`apps/work-api/src/providers/sync/microsoft.ts` around the paginated calendar response currently triggers `TS7022` after Prisma generation.

Required work:

- make the Graph calendar page/pagination variables explicitly typed so TypeScript does not infer a recursive/implicit-any shape;
- review the equivalent delta pagination path for the same issue;
- verify Work API typecheck locally after Prisma generation.

### Blocker — CalDAV SSRF / credential exfiltration path

The current CalDAV setup accepts an arbitrary user-provided HTTPS URL, and the URL validator historically permitted `http://localhost`. Those URLs are later used for credential-bearing WebDAV requests.

This is a hard security blocker.

Required security contract:

1. CalDAV user URLs must be `https:` in production. No localhost HTTP exception in production code.
2. Resolve the hostname before each credential-bearing request.
3. Reject loopback, unspecified, link-local, private RFC1918 ranges, carrier-grade NAT, multicast/reserved ranges, IPv6 loopback/link-local/ULA/site-local/mapped-private addresses, and deployment metadata ranges such as `169.254.169.254`.
4. Re-validate after DNS resolution to defend against DNS rebinding.
5. Disable automatic redirects for credential-bearing CalDAV requests or manually follow only after validating the redirect target with the same policy. Never forward Authorization across an unvalidated redirect.
6. Apply the same origin/policy to discovered principal, calendar-home and calendar/event hrefs.
7. Prefer an explicit deployment allow/deny policy hook (for example approved domains or an administrator-controlled allowlist) in addition to IP-range enforcement.
8. Add deterministic SSRF tests covering hostname-to-private-IP resolution, IPv4/IPv6 literals, redirects, DNS rebinding simulation, localhost, metadata IPs, and safe public hosts.

Do not consider CalDAV shippable until these cases are covered.

### High — synchronization has no lease / concurrency guard

Manual connection sync, per-calendar sync and scheduler sync can currently overlap. Two runs can observe the same missing mapping, both create local events, then race on the unique mapping; outbound provider writes can also duplicate.

Required work:

- add a database-backed lease / compare-and-set sync-run guard;
- scope leases so connection sync and calendar sync cannot overlap for the same connection/calendar;
- give leases an expiry/heartbeat strategy so crashed workers do not deadlock synchronization indefinitely;
- return a deterministic `already-running`/conflict outcome rather than starting a second run;
- ensure scheduler skips leased connections rather than treating them as failures;
- add concurrency/idempotency tests that race two runs against the same mapping.

In-memory mutexes are not sufficient because Work API can run in multiple processes/instances.

### High — read-only remote calendars are not preserved

Provider discovery exposes `readOnly`, but linking currently discards that fact. The synchronizer can therefore attempt updates/deletes against a read-only provider calendar.

Required work:

- persist sync direction/capability on the calendar mapping, or explicitly reject read-only calendar linking;
- preferred behavior for useful subscriptions: allow read-only calendars as **remote → Work one-way** links;
- never push local create/update/delete to a read-only remote calendar;
- expose this state through the browser-safe calendar-link contract so the UI can explain it;
- add read-only discovery/link/sync regressions.

### High — N+1 / timeout-prone convergence

`sync-run.service.ts` processes remote changes sequentially with multiple DB calls per event, then lists all local events and performs another mapping lookup per local event. A Google page may contain up to 2,500 events.

Required work:

- batch-load existing event mappings for a calendar mapping;
- batch-load local events needed for convergence;
- index mappings in memory by `remoteId`, `localId`, and where useful iCalendar UID;
- perform bounded-concurrency remote/local mutations rather than unbounded or fully sequential loops;
- avoid one database round-trip per event;
- keep cursor advancement after successful convergence only;
- document/choose a safe batch size and concurrency limit;
- add a large-page test proving query/mapping lookups are bounded rather than O(N) round trips.

### Medium — local calendar + sync mapping creation is not atomic

Linking a remote calendar creates the local Work calendar and then its mapping separately. Mapping failure or concurrent linking can leave orphan calendars.

Required work:

- move local calendar creation + calendar sync mapping creation into one Prisma transaction / repository operation;
- make duplicate concurrent link attempts deterministic and idempotent;
- when linking to an existing local calendar, validate tenant ownership before mapping;
- add rollback and concurrent-link tests.

### Medium — `sync-run.service.ts` is too concentrated

The service grew to roughly 600+ lines and currently mixes conflict resolution, local mutation, provider mutation, cursor recovery, health state, scheduling and serialization.

Required refactor before closeout:

- keep orchestration/lease ownership in a small run coordinator;
- extract provider-neutral convergence/conflict decisions into pure/testable units;
- extract mapping/local persistence batching behind repository/service helpers;
- keep provider error/cursor recovery policy separate from event convergence;
- keep serializers outside orchestration;
- do not introduce a generic framework larger than the problem; use a few focused modules.

A reasonable target split is conceptually:

- `sync-run.service.ts` — run orchestration + lease lifecycle only;
- `sync-convergence.ts` — provider-neutral local/remote decision logic;
- `sync-events.ts` or equivalent — batched event persistence/provider application;
- `sync-health.ts` — connection/mapping error/health state;
- existing provider adapters remain provider-specific HTTP translators.

The exact filenames may follow repository conventions; preserve behavior over naming.

## Verification already observed locally

From the local AI review at `fd4b3b99e`:

- Existing `@876/work` tests: **243 passed**.
- Existing Work API tests: **575 passed**.
- `@876/work` compiles.
- Work API **does not compile** because of the Microsoft adapter TS7022 issue.
- Frozen-lockfile pnpm verification is blocked by the stale Work API importer.
- New Phase 6 focused coverage at that point only covered credential sealing.

These are historical verification results for that reviewed commit, not proof that the current branch passes after later commits.

## Source work that landed after that review

The branch subsequently added a safe Invoice calendar-sync BFF. Browser responses use a dedicated `WorkSyncConnectionSummary` projection that intentionally omits:

- `credentialRef`;
- provider remote-account IDs;
- legacy connection-level `syncCursor`;
- OAuth refresh/access tokens;
- CalDAV username/password.

Retain that privacy boundary.

## Remaining Phase 6 product work

After the blockers above are resolved, finish the original Phase 6 scope:

### Browser adapter

Add `@876/work/browser` same-origin methods for:

- list/setup connections;
- Google/Microsoft authorize;
- remote-calendar discovery;
- list/link/unlink calendar mappings;
- sync connection;
- sync one linked calendar;
- disconnect connection.

The browser contract must use only browser-safe summaries and public link/run types.

### Controlled Work UI

Add transport-free `@876/work-ui` connected-calendar controls for:

- Google connection;
- Microsoft connection;
- CalDAV setup;
- connected/error/reconnect states;
- remote calendar discovery;
- linking/importing a remote calendar;
- linked calendar list;
- read-only / one-way status;
- sync now;
- unlink;
- disconnect.

Provider credentials/tokens must never be stored in component state longer than required to submit setup and must never be rendered back after submission.

### Widget Manage integration

Integrate connected calendars under the existing `876 Calendar` **Manage** view. Do not create a separate productivity data plane or a second calendar model.

Suggested hierarchy:

`Manage → Calendars → Connected calendars → Google / Microsoft / CalDAV`

### OAuth return UX

The public Work callback must return the user to the Invoice Calendar/Manage surface using a safe configured application return URL or an equivalent server-controlled flow. Do not accept an arbitrary browser `returnTo` URL from OAuth state.

Display success/error state without exposing provider error payloads, tokens or codes that should remain server-side.

## Missing test matrix

Before Phase 6 is source-complete, add focused deterministic tests for at least:

### Provider adapters

- Google calendar-list pagination;
- Google event pagination + sync-token advancement;
- Google 410 invalid cursor recovery;
- Google refresh-token flow;
- Microsoft calendar pagination;
- Microsoft delta nextLink/deltaLink validation;
- Microsoft expired/invalid delta recovery;
- Microsoft token refresh;
- CalDAV principal/home discovery;
- CalDAV calendar discovery;
- CalDAV sync-token incremental changes;
- CalDAV deletion responses;
- provider 401/403, 429/retry-after, 5xx and malformed response mapping;
- redirect and SSRF policy.

### OAuth/account lifecycle

- OAuth state is random, hashed at rest, expiring and single-use;
- callback rejects wrong/expired/replayed state;
- callback is bound to connection/provider;
- user A cannot operate user B's connection;
- cross-org IDs fail closed;
- provider account metadata never becomes authority;
- CalDAV setup seals the password immediately and never echoes it.

### Synchronization/convergence

- first import;
- incremental update;
- remote delete;
- local create/update/delete push;
- local-changed-after-remote-delete recreation reuses the mapping;
- simultaneous local/remote edit conflict policy;
- multiple remote calendars on one account;
- event IDs isolated per calendar mapping;
- invalid cursor reset/full-resync behavior;
- Microsoft sync-window rollover;
- read-only calendar never pushes;
- lease prevents overlapping manual/scheduler runs;
- retry after a failed run is idempotent;
- large provider page uses bounded DB lookups/concurrency;
- cursor is not advanced on partial failure.

### BFF/browser/widget

- server-owned user identity;
- browser cannot submit `credentialRef`, account id or cursor;
- safe connection projection never leaks secrets;
- permission + Work widget feature gates;
- connected-calendar UI loading/error/retry;
- stale connection/discovery requests are discarded after selection change;
- OAuth return state renders without leaking provider payloads.

## Lockfile handoff

The local orchestrator must regenerate/reconcile `pnpm-lock.yaml` from the final `apps/work-api/package.json` changes. GPT Web should not claim this blocker fixed merely by editing YAML text unless local pnpm verification confirms the lockfile is accepted.

## Required local verification before PR readiness

Run from the repository root using the repo's normal pnpm workflow. At minimum verify:

```bash
pnpm install --frozen-lockfile
pnpm --filter @876/work typecheck
pnpm --filter @876/work test
pnpm --filter @876/work-api typecheck
pnpm --filter @876/work-api test
pnpm --filter @876/widgets typecheck
pnpm --filter @876/widgets test:browser
pnpm --filter invoice typecheck
```

Also run Prisma validation/generation/migration checks required by the Work API rules and apply the Phase 6 migration only in an appropriate local/test database first.

If package filter names differ, resolve them from the current package manifests rather than blindly copying the command.

## Phase 6 completion gate

Do not call Phase 6 complete until all of the following are true:

- Work API compiles after Prisma generation;
- frozen lockfile verification succeeds;
- CalDAV SSRF path is closed and covered by tests;
- sync runs have a database-backed lease/idempotency guard;
- read-only calendars cannot receive writes;
- calendar creation + mapping is atomic;
- convergence avoids per-event N+1 mapping queries;
- large sync/service code has been decomposed enough to test conflict decisions independently;
- provider/OAuth/sync/security/browser/widget regressions are present;
- tracker reflects actual source state;
- final GPT-Web report is written;
- local orchestrator verification results are recorded honestly.

No PR should be opened from GPT Web unless the user explicitly requests one.
