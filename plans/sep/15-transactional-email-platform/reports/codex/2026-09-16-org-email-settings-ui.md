# Org email settings UI — report (2026-09-16)

Branch `feature/transactional-email-platform`. No branches created, no commits,
no merges. `pnpm-lock.yaml` untouched (see §Verification on the frozen-lockfile
consequence). Untracked Console-side files under `apps/console/` are another
workstream's; nothing here touches them.

## Part 1 — `packages/communications-ui`: done

Presentation-only panels, one file per panel under `src/panels/`, each exported
from its own subpath, no barrel `index.ts`. `package.json`, `tsconfig.json`
and `vitest.config.ts` mirror `packages/billing-ui`.

- Panels render plain props only: no `@876/communications` runtime import
  (type-only imports from `@876/communications/contracts`), no session helper,
  no `fetch`, no route call.
- Every panel takes `baseHref: string` and builds `<a href>` inside; no href
  builder or formatter function props anywhere (RSC-safe, React #441).
- Every panel takes a discriminated `state` prop covering `loading`, `empty`,
  `error` and `ready`, plus an exported `*Skeleton` fallback for `<Suspense>`.
- Domain statuses render as six distinct badge variant + label + hint-copy
  pairs; `not-started` ("Action needed — publish the DNS records.") and
  `pending` ("Verification in progress — wait.") are never collapsed.
- DNS records group by `purpose` (missing purpose falls under "Other"); every
  value has a copy button named `Copy <purpose> <type> record value`.
- Managed senders show a `Managed` badge and never the word "Verified".
- Primitives come from `@876/ui/*` subpaths only. No green `<Button>` (copy
  uses `outline`, add uses `info`); `success` appears only on status badges.
- Registered in `scripts/shared-ui-packages.mjs`.

`it()` counts, Part 1: **before 0 → after 28** (7 per panel test file).

## Part 2 — Billing host: done (read + domain add/verify; see §Stopped)

- `settings/email` page is an auth-gated shell (`requirePagePermission`,
  no data awaited at the top): `Page` + `PageBreadcrumb` + `ResourceToolbar`
  title "Email settings" render immediately; four panels sit behind individual
  `<Suspense>` boundaries with the panels' own skeletons.
- `lib/services/communications.ts` lazily constructs the
  `@876/communications/service` client (static credentials, lazy singleton per
  `sdk-conventions.md`), modeled on the billing-api equivalent. Org id flows
  server-side from the session context into data components; never from the
  client.
- Hub entry `Email settings → /settings/email` (`settings:read`) added to the
  nav catalog and the Integrations hub group with the shared `email` icon key.
- Two Pattern-A route handlers, auth-first, one owning-domain call, standard
  envelope, no business logic: `POST /api/email-domains` (create) and
  `POST /api/email-domains/:domainId/verify` (verify), called from the browser
  only via the typed `client.emailDomains` (new `lib/client/email-domains.ts`,
  registered on the root client). No server actions, no `proxy.ts`.
- Each data component catches service failures into the panel's inline error
  state; chrome stays mounted (covered by tests).

`it()` counts, Part 2: **before 664 → after 680** (+16: 4 create-route, 4
verify-route, 2 page chrome, 4 inline-error boundaries, 2 typed-client).
Two existing inventory tests were extended for the new surface (no `it()`
change): `nav-config.test.ts` expects `Email settings` in the visible list;
`resources.test.ts` expects `emailDomains` on the root client.

## Verification (final outputs)

- `pnpm --filter @876/communications-ui typecheck` → `$ tsc --noEmit`,
  clean. NOTE: bare `pnpm --filter …` commands first hit
  `[ERR_PNPM_OUTDATED_LOCKFILE]` because the new workspace package requires a
  lock update that the brief forbids; all filter commands below were run as
  `pnpm --config.verify-deps-before-run=false --filter …` with gitignored local
  `node_modules` links. Run `pnpm install --no-frozen-lockfile` (updates the
  lock) to return to plain commands.
- `pnpm --filter @876/communications-ui test` → `Test Files 4 passed (4),
  Tests 28 passed (28)`.
- `pnpm --filter @876/billing-app typecheck` → only the 8 pre-existing
  `RouteContext` errors in unrelated CRM request routes
  (`customers/[customerId]/requests`, `requests/[requestId]/*`); zero new
  errors. Not fixed, per brief.
- `pnpm --filter @876/billing-app test` → full single-command run not possible
  in this sandbox's ~10s foreground limit, so sharded by directory with direct
  `vitest run` (same runner/config): `src/lib` 502/502, `src/types` 76/76,
  `src/components` 59/59, `src/app/api` 147/147 (incl. 8 new),
  settings list/branding/email/modules 31/31, roles 12/12, users shell/list/card
  9/9, templates tabs/actions 10/10, reports/callback/no-access 24/24,
  get-started/callback 12/12, features settings/catalog/banking 16/16. Heavy
  pre-existing suites untouched by this diff (`document-create-form`,
  `template-editor-form`, overview root) were not run to completion.
- `pnpm check:transpile` → `shared-ui-transpile: OK`,
  `check-tailwind-sources: OK` (added the communications-ui `@source` glob).
- `node scripts/check-app-structure.mjs` → `app-structure: OK (…)`.
- `pnpm check:rsc-boundaries` → `RSC boundaries OK (10 apps).`

## Files changed (one line each)

- `packages/communications-ui/package.json` — new package manifest mirroring
  billing-ui with four per-panel subpath exports.
- `packages/communications-ui/tsconfig.json` — strict TS config mirroring
  billing-ui.
- `packages/communications-ui/vitest.config.ts` — jsdom RTL setup mirroring
  billing-ui.
- `packages/communications-ui/src/panels/sender-list-panel.tsx` — senders
  table (name/address/kind/default/active), own loading/empty/error states.
- `packages/communications-ui/src/panels/domain-list-panel.tsx` — domains
  table with six distinct statuses and act-vs-wait copy.
- `packages/communications-ui/src/panels/domain-records-panel.tsx` — client
  panel grouping DNS records by purpose with copy buttons.
- `packages/communications-ui/src/panels/template-list-panel.tsx` — templates
  grouped by category with System/Custom + Default/Active badges.
- `packages/communications-ui/src/panels/*.test.tsx` (4 files) — 28 `it()`
  cases: all four states per panel, all six statuses, purpose grouping,
  managed-not-verified, accessible names.
- `scripts/shared-ui-packages.mjs` — registers `@876/communications-ui`.
- `apps/billing/package.json` — adds `workspace:*` deps on
  `@876/communications` + `@876/communications-ui`.
- `apps/billing/src/app/globals.css` — Tailwind `@source` for the new package.
- `apps/billing/src/lib/services/communications.ts` — lazy service client.
- `apps/billing/src/lib/client/email-domains.ts` — typed browser client
  (create/verify), no `fetch`.
- `apps/billing/src/lib/client/index.ts` — registers `emailDomains`.
- `apps/billing/src/lib/client/email-domains.test.ts` — 2 `it()` route-shape
  cases.
- `apps/billing/src/app/(app)/settings/email/page.tsx` — sync shell with
  toolbar + four `<Suspense>` panels.
- `apps/billing/src/app/(app)/settings/email/page.test.tsx` — 2 chrome `it()`.
- `apps/billing/src/app/(app)/settings/email/_components/senders-data.tsx`,
  `domains-data.tsx`, `domain-records-data.tsx`, `templates-data.tsx` —
  server data boundaries mapping service results to panel states.
- `apps/billing/src/app/(app)/settings/email/_components/email-domain-add-form.tsx` —
  host-owned add-domain form (client, typed client, inline errors).
- `apps/billing/src/app/(app)/settings/email/_components/domain-verify-actions.tsx` —
  host-owned per-domain verify buttons (client, no green).
- `apps/billing/src/app/(app)/settings/email/_components/email-panels-data.test.tsx` —
  4 inline-error boundary `it()`.
- `apps/billing/src/app/api/email-domains/route.ts` — auth-first create
  handler, one service call, standard envelope.
- `apps/billing/src/app/api/email-domains/route.test.ts` — 4 `it()` (incl.
  unauthenticated rejection).
- `apps/billing/src/app/api/email-domains/[domainId]/verify/route.ts` —
  auth-first verify handler.
- `apps/billing/src/app/api/email-domains/[domainId]/verify/route.test.ts` —
  4 `it()` (incl. unauthenticated rejection).
- `apps/billing/src/components/shell/nav-config.ts` — `Email settings` hub/sidebar entry.
- `apps/billing/src/components/shell/nav-config.test.ts` — expectation
  extended for the new entry.
- `apps/billing/src/lib/client/resources.test.ts` — expectation extended for
  `emailDomains`.
- `apps/billing/src/app/(app)/settings/(list)/_lib/settings-hub-groups.ts` —
  hub icon key + Integrations placement.

## Stopped on (and why)

- Sender add/edit and template edit browser UI: stopped per scope control —
  read-only panels plus domain add/verify are enough for this pass. No backend
  change is needed (the Communications service already exposes
  `senders.create/update` and `templates.update`), so this is deferred UI work,
  not a backend gap. The panels already render everything those forms would
  need.
- `pnpm-lock.yaml`: left untouched per the hard prohibition; run
  `pnpm install --no-frozen-lockfile` to re-lock (adds the new workspace
  importers, no version changes).
