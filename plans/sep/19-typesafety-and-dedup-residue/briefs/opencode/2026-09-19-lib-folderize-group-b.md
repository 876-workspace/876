# Give every `src/lib/` module its own folder — APPS: `apps/couriers` (12 files), `apps/876` (6), `apps/invoice` (6), `apps/enterprise` (5), `apps/crm` (4), `apps/commerce` (1)

## The rule

`src/lib/` holds **directories, not loose files**. Every module gets a folder
and an `index.ts`, so its parts, its tests and its types live together, and the
root reads as a list of capabilities rather than a landfill.

```
lib/permissions.ts       →  lib/permissions/index.ts
lib/permissions.test.ts  →  lib/permissions/index.test.ts
lib/slug.ts              →  lib/slug/index.ts
lib/logger.ts            →  lib/logger/index.ts
```

`<name>/index.ts` is a module's **declared entry point**, which
`.agents/rules/app-structure.md` exempts from the no-barrel rule. It is not a
barrel over unrelated files. Do not add any other `index.ts`.

## Why the import churn is near zero

TypeScript resolves `@/lib/permissions` to **both** `lib/permissions.ts` and
`lib/permissions/index.ts`. So moving the file changes no import statement. If
you find yourself editing import paths, you have done something wrong — stop
and report it.

The exception is a file imported by a **deep path** (`@/lib/foo/bar`), which
cannot exist for a loose file, so there should be none.

## Your scope — these apps only

`apps/couriers` (12 files), `apps/876` (6), `apps/invoice` (6), `apps/enterprise` (5), `apps/crm` (4), `apps/commerce` (1)

For each app, `ls apps/<app>/src/lib/*.ts apps/<app>/src/lib/*.tsx` gives the
complete list. Every one of those files moves.

## Steps, per file

1. `mkdir apps/<app>/src/lib/<basename>`
2. `git mv apps/<app>/src/lib/<basename>.ts apps/<app>/src/lib/<basename>/index.ts`
3. If `<basename>.test.ts` (or `.test.tsx`, `.spec.ts`) exists:
   `git mv` it to `<basename>/index.test.ts` with the same extension.
4. **Fix relative imports inside the moved file.** It is now one directory
   deeper, so every `./x` becomes `../x` and every `../y` becomes `../../y`.
   This is the one thing that actually breaks — check every relative specifier
   in every file you move, including inside the test.
5. Leave `@/…` alias imports alone; they are unaffected by depth.

### Orphan tests

A `*.test.ts` whose subject is **not** a file in `lib/` (it scans the route tree,
say) still gets its own folder: `api-envelope-routes.test.ts` →
`api-envelope-routes/index.test.ts`. There will then be no `index.ts` beside it,
which is correct — do not invent one.

### Name collisions

If a folder with that basename already exists (e.g. `lib/format.ts` beside a
`lib/format/` directory), **stop and report it**. Do not merge them yourself.

## Hard prohibitions

- Do **not** change any file's contents beyond relative-import depth.
- Do **not** rename a module, merge two modules, or split one.
- Do **not** edit an `@/lib/...` import anywhere in the app.
- Do **not** add an `index.ts` that re-exports sibling modules.
- Do **not** add `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`,
  or `as unknown as`. The user has stated `any` must never be used.
- Do **not** touch any app outside your scope, `packages/`, `plans/`,
  `.claude/rules/`, `.agents/rules/`, or `scripts/`.
- Do **not** `git commit`, branch, or open a PR.

## Verify — one command at a time, ~3 GB free

For each app in your scope:

```
pnpm --filter <package-name> typecheck
pnpm --filter <package-name> test
```

Package names: `@876/console`, `@876/billing-app`, `@876/couriers-app`,
`@876/projects`, `@876/app` (for `apps/876`), `@876/enterprise`,
`@876/invoice-app`, `@876/crm`, `@876/commerce-app`.

If `pnpm` fails with `runDepsStatusCheck` / `install`, run `pnpm install` once
first — another task changed a manifest.

Then, for each app in scope:

```
ls apps/<app>/src/lib/*.ts apps/<app>/src/lib/*.tsx 2>/dev/null | wc -l   # expect 0
```

## Report

`plans/sep/19-typesafety-and-dedup-residue/reports/opencode/2026-09-19-lib-folderize-group-b.md`
— per app: the files moved and the count, every relative import you had to
re-depth, any collision you stopped on, the final `ls` count, and the typecheck
and test results verbatim. A truthful "not verified" beats a confident claim.
