# Brief — Organization email settings: shared panels + Billing host

Repo `/root/projects/876`, branch `feature/transactional-email-platform` (already
checked out). Do NOT create/switch/merge branches. Do NOT commit. Do NOT edit
`pnpm-lock.yaml`.

## Goal

Let an organization see and manage its own email setup — the free sender it
already has, its sending domains and their DNS records, and its templates. This
is the organization-facing half of the platform whose backend is already built
and verified.

Two deliverables:

1. `packages/communications-ui` — presentation-only panels, so Console can mount
   the same ones later at operator authority rather than growing a second copy.
2. `apps/billing` — the `settings/email` page that hosts them, plus the route
   handlers that authorize the session and call the service.

## Rules you MUST read first, completely, in this order

1. `.agents/rules/email.md` — the binding standard. Sections "Sending identity",
   "Templates and rendering", and "Do not" constrain this UI directly.
2. `.agents/rules/shared-product-ui.md` — what may and may not live in a
   `<product>-ui` package. This is the rule that decides the whole file layout.
3. `.agents/rules/app-layout.md` — page containers, `ResourceToolbar`, table cell
   hierarchy, button labels, form anatomy (`FormRow`), the settings hub.
4. `.agents/rules/app-structure.md` — where a component file is allowed to live.
5. `.agents/rules/api-access.md` and `.agents/rules/app-api-routing.md` — the
   route-handler boundary. **No server actions.**
6. `.agents/rules/data-loading.md` — chrome renders immediately; only the parts
   waiting on I/O shimmer.
7. `.agents/rules/error-handling.md` — a failed panel must not take over the page.

## Part 1 — `packages/communications-ui`

Create the package following `packages/billing-ui` exactly as the model for its
`package.json`, `tsconfig.json`, exports and test setup. Read
`packages/billing-ui/package.json` first.

Panels, each in its own file under `src/panels/`, each exported from its own
subpath (**no barrel `index.ts` re-exporting the directory**):

| File | Shows |
| --- | --- |
| `sender-list-panel.tsx` | The org's senders: name, address, kind, default, active |
| `domain-list-panel.tsx` | Sending domains with status |
| `domain-records-panel.tsx` | One domain's DNS records to publish |
| `template-list-panel.tsx` | Templates by category, marking system vs org-owned |

Hard constraints, from `shared-product-ui.md` and `email.md`:

- **A panel renders; it never fetches.** No import of `@876/communications`, no
  session helper, no `fetch`, no route call. It receives already-resolved plain
  data as props.
- **A panel takes no href builder and no formatter function as a prop.** Pass a
  `baseHref: string` and build links inside. This is not style: a function prop
  crossing the RSC boundary crashes the route in a production build with React
  #441 — see `.agents/rules/production-render-errors.md`.
- **Each panel owns its empty, loading and error presentation** via a
  discriminated `state` prop, so an empty list and a failed load are visibly
  different things.
- Types come from `@876/communications/contracts`. Do not restate them.
- Import primitives from `@876/ui` subpaths only.

Domain status is `not-started | pending | partially-verified | partially-failed |
verified | failed` and the distinction matters to the user: `not-started` means
*you must act*, `pending` means *wait*. Render them as distinct states with
distinct copy — do not collapse them, and do not use a green **button** for any
action (green is status-only; see the root `CLAUDE.md`).

Each DNS record carries an optional `purpose` (SPF, DKIM, Tracking) separate from
its DNS `type`. Group and label rows by `purpose` — several records share a name
and differ only by `type`, so `purpose` is the only thing that makes the list
readable. Give each value a copy-to-clipboard affordance.

**Tests: floor 20 `it()` cases** across the panels, with React Testing Library,
matching `packages/billing-ui`'s existing test style. Cover: each state
(loading/empty/error/loaded) per panel, every domain status rendering distinctly,
records grouped by purpose, a managed sender shown as managed and not as a
verified domain, and accessible names on interactive elements.

Register the package in the shared transpile list — `scripts/shared-ui-packages.mjs`
— and run `pnpm check:transpile`.

## Part 2 — Billing host

Add `apps/billing/src/app/(app)/settings/email/page.tsx` beside the existing
`settings/branding` and `settings/templates` (read one of those pages first and
match its shape, container and toolbar exactly).

- The page is a **synchronous shell**: toolbar and headings render immediately,
  each panel sits behind its own `<Suspense>` with the panel's own fallback. Do
  not await data at the top of the page.
- Data is loaded server-side through a **new** module
  `apps/billing/src/lib/services/communications.ts` that lazily constructs the
  `@876/communications/service` client. Model it on the existing
  `apps/billing-api/src/lib/services/communications.ts`. Read
  `.agents/rules/sdk-conventions.md` on client lifetime before writing it.
- Resolve the organization from the **session**, server-side. Never take an
  organization id from the client.
- Add the settings hub entry so the page is reachable, following the hub's
  existing card pattern and the `"<Module> settings"` naming note in
  `app-layout.md` §10c.

Mutations (add a domain, verify a domain, add/edit a sender, edit a template) go
through thin route handlers under `apps/billing/src/app/api/`:

- authorize the session and the org **first**, then call one owning-domain
  operation, then return the standard envelope;
- **no business logic in the handler**;
- called from the browser through the app's existing typed client, not `fetch`.

**Scope control:** if wiring a mutation requires changing the Billing API or the
Communications service, **stop and report it instead**. Read-only panels plus the
domain add/verify mutations are enough for this pass; do not invent backend
endpoints.

**Tests: floor 10 `it()` cases** for the host — the page renders its chrome
without data, each route handler rejects an unauthenticated request, and a
service error renders inline without tearing down the page.

## Hard prohibitions

- No server actions. No `proxy.ts` or `middleware.ts`.
- No `as any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, or tsconfig
  relaxation. `as unknown as T` only for a real library mismatch; say so.
- No function/component props crossing from a server component into a client one.
- No green buttons. No explanatory `<p>` paragraph under a section heading (see
  the root `CLAUDE.md` "UI Copy").
- Do not weaken production code to make a test easier.
- Do not display or log a provider API key, internal key, or any secret.
- Do not let the browser learn a service origin or credential.
- Do not delete or skip an existing test.
- Do not commit, branch, or open a PR.

## Verification — foreground, one at a time

```bash
cd /root/projects/876
pnpm --filter @876/communications-ui typecheck
pnpm --filter @876/communications-ui test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm check:transpile
node scripts/check-app-structure.mjs
pnpm check:rsc-boundaries
```

`pnpm --filter @876/billing-app typecheck` already reports **8 pre-existing
errors** about a missing `RouteContext` type in unrelated CRM request routes.
Those are stale Next generated types and are **not yours** — do not fix them, do
not count them, and do not add any new error.

## Report

`plans/sep/15-transactional-email-platform/reports/codex/2026-09-16-org-email-settings-ui.md`
— per-part status, literal `it()` counts before and after, the final output of
every command above, each file changed with a one-line reason, anything you
stopped on and why. A truthful "not done" beats a false claim.
