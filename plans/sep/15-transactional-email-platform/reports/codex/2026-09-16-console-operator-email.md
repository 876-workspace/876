# Console operator email surface — report

## Status

Done. Console can inspect any organization's senders, sending domains (with DNS
records), templates, and delivery history, and can re-check a domain's DNS
verification. Read-only plus the one verify mutation; suspend/resume was not built.

## What was built

- Operator service module `apps/console/src/lib/services/communications.ts`:
  request-scoped `createCommunications(requestId)` factory plus a `communications`
  const, importing only `@876/communications/operator`. Mirrors `platform.ts` /
  `crm.ts`. It is `server-only` and the only Console module that knows
  Communications exists.
- Seven handlers under Console's organization vocabulary (no `/api/communications/*`):
  `GET email/senders`, `GET email/domains`, `GET email/domains/[domainId]`,
  `GET email/templates`, `GET email/deliveries`, `GET email/deliveries/[deliveryId]`,
  `POST email/domains/[domainId]/verify`. Each checks
  `requireConsolePermission('console:organizations')` first, then audits (where
  required), then makes exactly one operator-client call and returns the canonical
  envelope. No business logic in handlers.
- Audit reuses the existing writer (`platform.auditEvents.create`, as the
  projects-issues routes do): `communications.deliveries.viewed` (list),
  `communications.delivery.viewed` (retrieve),
  `communications.domain.verify-requested` (mutation). Sender/domain/template
  reads are configuration and are not audited. Audit writes are awaited but
  non-fatal (`.catch(() => null)`), matching the existing pattern.
- Permission: reused `console:organizations` — already in the catalog and granted
  to admin and super-admin. No new catalog key was added, and none is needed:
  every other organization-scoped operator route (members, issues, labels, …)
  uses this key, and the catalog itself lives in `@876/core`, outside this
  brief's `apps/console/` scope. No navigation was added, so the
  registry-to-route binding is untouched.
- Page `apps/console/src/app/(app)/orgs/[slug]/email/` (`page.tsx` + `loading.tsx`):
  the brief's `orgs/[slug]/workspace/…` path no longer exists (it redirects to
  `/workspace/:orgSlug`), so the page mounts beside the other per-organization
  views inside the org detail layout, covered by the existing `/orgs` route
  permission. Chrome (title) renders synchronously; five data regions
  (senders, domains + verify actions, DNS records, templates, deliveries) each
  sit behind their own `<Suspense>`. Scrolling page: no list/detail shell, no
  `h-full`. Delivery status keeps all eight labels as `<Badge>`; domain status
  keeps all six via the shared panel. Verify button is `outline`; no green
  buttons; no explanatory `<p>` under headings.
- Mounted the shared panels (`SenderListPanel`, `DomainListPanel`,
  `DomainRecordsPanel`, `TemplateListPanel` from `@876/communications-ui`) —
  the package exists, so no second UI package and no Console-local config tables.
  Console-local tables exist only for deliveries (`features/email/components/`,
  per the brief): `DeliveriesTable`, `DeliveryStatusBadge`, plus the
  client-side `DomainVerifyActions` (serializable props only; calls the new
  `emailDomains.verify` browser client in `src/lib/client/email.ts`, registered
  in `src/lib/client/index.ts`).

## Test counts

- Before: 1348 textual `it()`s in `apps/console/src`.
- After: 1384 textual `it()`s (+36), 44 new runtime cases: 30 route tests
  (7 files: 403-denial, 401-denial, envelope/success with exact call counts and
  arguments, audit assertions with acting operator + organization + resource,
  404 mapping, limit passthrough, service-error passthrough) plus 14 component
  tests (8 delivery statuses, table rows/empty/inline-error, verify
  hidden-on-verified/exact-args/refresh/inline-error).
- Floor requirement (14) exceeded; every assertion checks exact values, counts,
  and arguments.

## Verification output (final)

- `tsc --noEmit` (direct binary; `pnpm --filter` is gated by a stale lockfile,
  see below): 4 errors, all pre-existing in
  `workspace/[orgSlug]/projects/{board,page,issues/[issueRef]/page}.test.tsx`
  (`projects.issue` fixture missing `taskListId`, `cycleId`, … from committed
  parallel projects work). Zero errors in any email/communications file.
- `eslint` on the full diff (`src/lib`, `src/features`, `src/app/api/organizations`,
  `src/app/(app)/orgs`): 0 errors; only pre-existing warnings in untouched files.
- `vitest run` (full console suite): 208 files, 1843 tests — 1837 pass,
  6 fail, all pre-existing and unrelated: 4 in `src/lib/permissions.test.ts`
  (caused by the committed `876 commerce` product catalog in `@876/core`
  shifting exact permission counts, e.g. staff 79 → 103) and 2 in the projects
  workspace page tests (same parallel projects work as the tsc errors).
- Targeted re-run: `route-permissions.test.ts`, `guard-coverage.test.ts`,
  `api-envelope-routes.test.ts`, `request-boundary.test.ts` — 4 files,
  173 tests, all pass. The registry-to-route binding test passes unmodified.
- `node scripts/check-app-structure.mjs`: OK (all apps).
- `node scripts/check-rsc-boundaries.mjs`: OK (10 apps).
- `node scripts/check-tailwind-sources.mjs`: OK (added the missing
  `@876/communications-ui` `@source` to console `globals.css`).
- `node scripts/check-env-parity.mjs`: console gap list byte-identical to the
  pre-existing baseline (18 vars); `COMMUNICATIONS_API_URL` /
  `COMMUNICATIONS_INTERNAL_KEY` are declared required in `.env.example` and
  configured in the gitignored local `apps/console/.env`.

## Files changed (one line each)

- `apps/console/package.json`: declares `@876/communications` + `@876/communications-ui`.
- `apps/console/.env.example`: adds required `COMMUNICATIONS_API_URL` (=4050) + `COMMUNICATIONS_INTERNAL_KEY`.
- `apps/console/src/app/globals.css`: adds the communications-ui Tailwind `@source`.
- `apps/console/src/lib/services/communications.ts` (new): operator service module.
- `apps/console/src/lib/client/email.ts` (new) + `index.ts`: browser verify transport.
- `apps/console/src/app/api/organizations/[id]/email/**/route.ts` (7 new): handlers.
- `apps/console/src/app/api/organizations/[id]/email/**/route.test.ts` (7 new): 30 tests.
- `apps/console/src/app/(app)/orgs/[slug]/email/page.tsx` + `loading.tsx` (new): operator page.
- `apps/console/src/features/email/components/` (new): deliveries table, status badge,
  verify actions + 14 tests.

## Environment notes (not code changes)

- `pnpm --filter` cannot run on this branch right now: the lockfile is stale
  against the committed `packages/communications-ui/package.json`
  (`ERR_PNPM_OUTDATED_LOCKFILE`), so all verification used the workspace binaries
  directly. `pnpm-lock.yaml` was not touched, per the brief.
- `apps/console/package.json` now declares the two workspace deps; their
  `node_modules/@876/*` symlinks were linked by hand to match (same as the
  billing app's working-tree state). Whoever regenerates the lockfile
  (`pnpm install`) will make this durable; until then a frozen install will not
  link them.
- Local-only (gitignored, untracked): `apps/console/.env` gained the two runtime
  values (key matches `apps/communications-api/.env`).

## Not done / deliberately out of scope

- Suspend/resume organization sending: not built (explicitly out of scope).
- No per-sender/per-template/per-delivery detail pages: shared panels link to
  `${baseHref}/senders|domains|templates/:id`, which do not exist yet; the
  retrieve API routes they would need already exist. Recommended follow-up.
- No new permission key, role grant, or navigation entry: `console:organizations`
  (admin, super-admin) already grants exactly this surface; adding a key would
  have required editing `@876/core`, outside scope.
- The 4 tsc errors, 6 test failures, and 18 `check:env` gaps above are
  pre-existing parallel-work fallout; none was "fixed" and none is mine.
