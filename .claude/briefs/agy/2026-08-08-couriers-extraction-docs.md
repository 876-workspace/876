# Brief — document the couriers service extraction plan

Documentation only. Do not modify any `.ts`, `.tsx`, `.prisma`, `.sql`, `.json`,
or `.cjs` file. Do not commit.

## Read first, fully

- `.claude/rules/sdk-conventions.md` — especially "Future product apps & SDKs".
- `.claude/rules/platform-services.md` — the three buckets and the credential tiers.
- `.claude/rules/express-api.md` — the shape a new API service takes.
- `apps/couriers/.dependency-cruiser.cjs` — the boundary rules and why they exist.
- `packages/billing/package.json` — the subpath exports an SDK package uses.
- `apps/couriers/src/lib/service/` — list the directories; each is a future module.

## Task — create `docs/couriers-extraction.md`

The couriers app is a Next.js app with an in-process datastore. It is going to
gain consumers that cannot share that process: a customer portal, a counter
**kiosk** (a customer types their mailbox number and their packages appear, then
staff hand them over), a driver/delivery app, a warehouse app, and the Console
admin surface. Each is a client of couriers' data, not a copy of it.

Write the document with these exact `##` headings, in this order:

```
# Couriers service extraction

## Why couriers needs its own API
## What is already in place
## Phase 1 — the boundary gate
## Phase 2 — apps/couriers-api
## Phase 3 — packages/couriers
## The kiosk is a new auth tier
## What we deliberately are not doing
```

Requirements, in detail:

- **Why couriers needs its own API** — name the five consumers above. State the
  trigger plainly: the second consumer justifies the service; one does not.
- **What is already in place** — the two-layer datastore rule
  (`prisma` singleton + `service.<resource>.<verb>()`), `ServiceResult`
  envelopes, and route handlers that hold no business logic. Explain that this
  is what makes extraction a *move* rather than a rewrite.
- **Phase 1** — list the five rules in `.dependency-cruiser.cjs` with a one-line
  explanation each, taken from the `comment` field of each rule. Then explain
  why `tsPreCompilationDeps` is `false`: a type-only import is erased at build
  time and carries no coupling, so counting them flags ordinary typed function
  signatures and turns the gate into noise.
- **Phase 2** — a table of the modules to port, in this order: tenants,
  branches, warehouses, customers, mailboxes, packages, team/roles, settings.
  Give each a one-line note on why it sits where it does in the order (tenants
  is smallest and proves the harness; packages is largest and waits until the
  pattern is settled). State that the database is **introspected and baselined,
  never recreated**, and that both apps point at the same Postgres during the
  transition.
- **Phase 3** — a table of the three subpaths (`@876/couriers`,
  `@876/couriers/integration`, `@876/couriers/admin`) with the credential tier
  and the consumer for each, mirroring `packages/billing`. State the rule that
  keeps this from becoming unmanageable: these packages hold **contracts and
  transport only, never behavior**, over one shared runtime in
  `@876/core/client`.
- **The kiosk is a new auth tier** — explain that nobody logs in to type a
  mailbox number, so the kiosk needs a device-scoped credential rather than a
  user session, scoped to one branch and to read-only package lookup plus
  collection check-in. Mark it as **not yet designed**.
- **What we deliberately are not doing** — the interim option in
  `.claude/rules/new-app-guide.md` §8 (a narrow `/api/admin/*` surface on the
  couriers Next app behind `x-internal-key` so Console can read couriers data).
  Say why it is rejected for now: it turns the Next app into an API server,
  which Cloudflare Workers/OpenNext hosts poorly under load.

Style rules:

- Plain declarative sentences. No marketing language, no "in today's fast-moving
  logistics landscape" openers, no exclamation marks.
- Every file path you cite must exist — verify each with a file read first.
- Do not invent module names, endpoints, package names, or file paths. If you
  cannot confirm something from the sources listed above, leave it out.
- Tables use the same Markdown pipe style as the rule files.

## Files you may touch — the complete list

```
docs/couriers-extraction.md   (create)
```

Touching anything else is a failure of this task.

## Verify before reporting done

```bash
pnpm exec prettier --check "docs/couriers-extraction.md"
git status --short
```

`git status --short` must list exactly that one file. If prettier fails, run
`pnpm exec prettier --write` on it and re-run the check. Report the final output
of both commands verbatim.
