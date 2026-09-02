# Brief — write the README for `apps/couriers-api`

Documentation only. Do not modify any `.ts`, `.prisma`, `.sql`, `.json`, or
`.cjs` file. Do not run any code generator. Do not commit.

## Read first, fully — every path below

1. `.claude/rules/express-api.md` — the spec this service is built to.
2. `apps/couriers-api/package.json` — the real scripts and dependencies.
3. `apps/couriers-api/src/app.ts` and `src/server.ts`.
4. `apps/couriers-api/src/config/` — the environment variables it actually parses.
5. `apps/couriers-api/src/http/` — middleware, auth guards, envelope, errors.
6. `apps/couriers-api/src/modules/tenants/tenants.routes.ts` — the real routes
   and their auth tiers.
7. `apps/couriers-api/prisma/schema/` — the models.
8. `apps/api/README.md` if one exists — match its tone and structure.

**Every command, script name, environment variable, route path, and file path
you write must be copied from those files.** Do not infer, do not guess, do not
carry over anything from another project. If you cannot confirm a detail from
the source, leave it out entirely.

## Task — create `apps/couriers-api/README.md`

Use these exact `##` headings, in this order:

```
# @876/couriers-api

## What this service owns
## Running it locally
## Environment
## Project layout
## Auth tiers
## Database
## Checks
```

Content requirements:

- **What this service owns** — two or three sentences. It serves couriers'
  operational data to consumers that cannot share the Next.js process: the
  customer portal, a counter kiosk, a driver app, a warehouse app, and Console.
  Today it exposes `health` and `tenants`; more modules follow.
- **Running it locally** — the real `dev` script from `package.json` and the
  port from `src/config/`. Read them; do not assume 3000 or 4000.
- **Environment** — a table of `Variable` | `Required` | `Purpose`, listing
  exactly the variables the Zod schema in `src/config/` parses, no more and no
  fewer.
- **Project layout** — a fenced tree of `src/`, one line per directory, with a
  short note on what each holds. Copy the real directory names.
- **Auth tiers** — a table of `Guard` | `Credential` | `Grants`, taken from the
  guards that actually exist in `src/http/auth/`. Add one sentence stating that
  guards attach per route rather than with `router.use`, so an unknown path
  returns 404 instead of 401.
- **Database** — state plainly that this service reads the **existing** couriers
  database owned by `apps/couriers/prisma/`, that models carry `@@map`/`@map`
  because the database is snake_case and the client is camelCase, and that **no
  migration here creates tables**.
- **Checks** — the four real script names from `package.json`, as a fenced bash
  block.

Style:

- Plain declarative sentences. No marketing language, no "blazing fast", no
  emoji, no exclamation marks.
- Tables use the same Markdown pipe style as the files in `.claude/rules/`.
- Fenced code blocks get a language tag.

## Files you may touch — the complete list

```
apps/couriers-api/README.md   (create)
```

Touching anything else is a failure of this task.

## Verify before reporting done

```bash
pnpm exec prettier --check "apps/couriers-api/README.md"
git status --short
```

`git status --short` must show `apps/couriers-api/README.md` as the only file
you changed — other files may already be modified by a concurrent task, so
confirm none of the _other_ entries are ones you touched. If prettier fails, run
`pnpm exec prettier --write` on the README and re-check. Report the final output
of both commands verbatim.
