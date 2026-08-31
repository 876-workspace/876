# Brief — delete `@876/client`, `@876/sdk`, and `@876/admin`

Model: `gpt-5.6-terra`, `model_reasoning_effort=high`.
Branch: `refactor/bounded-service-clients` (already checked out; do not branch, commit, rebase, merge, or open a PR).

This is the **final** pass of the bounded-client migration
(`docs/architecture/020-bounded-service-clients-and-application-bffs.md`).
Every application has already been migrated to bounded clients by earlier
passes. Your job is to remove the old architecture and leave the workspace
tooling consistent.

## Preconditions — check these first and stop if any fails

```bash
grep -rn "@876/client\|@876/sdk\|@876/admin" apps packages scripts \
  --include=*.ts --include=*.tsx --include=*.json --include=*.mjs \
  | grep -v node_modules \
  | grep -v "^packages/\(client\|sdk\|admin\)/"
```

Every remaining hit must be inside `packages/client`, `packages/sdk`, or
`packages/admin` themselves, or in a `.vercel/` build artifact (ignore those —
they are generated and gitignored).

**If any application or other package still imports one of the three, stop and
report it. Do not migrate that call site yourself** — a later pass owns it, and
guessing at its authority is exactly the mistake this migration exists to
prevent.

## What to delete

```
packages/client/
packages/sdk/
packages/admin/
```

Use `git rm -r` so the deletions are staged as deletions rather than appearing
as untracked churn. Do **not** commit.

`packages/sdk` and `packages/admin` are currently five one-line re-export shims
over `@876/account` and `@876/platform`; their implementation already moved.
`packages/client` is the mega-facade the ADR removes outright. No compatibility
alias survives — that is a deliberate goal, not an oversight.

## Then clean up everything that referenced them

Search the whole repo, not just `apps/` and `packages/`:

- **`package.json` dependencies** in every app and package that listed any of the three.
- **`next.config.ts` `transpilePackages`** entries for `@876/sdk`, `@876/admin`, `@876/client` in every app. These lists are built by `sharedTranspilePackages()` from `scripts/shared-ui-packages.mjs` plus a per-app array — remove the dead entries from the per-app arrays. Check whether `SHARED_UI_PACKAGES` itself names any of the three.
- **Root `package.json` scripts** — `build:sdk` and anything similar that builds or checks the deleted packages. Retarget to `@876/account` / `@876/platform` where the intent still applies; delete where it does not.
- **`pnpm-workspace.yaml`**, Turbo config, CI workflows under `.github/workflows/`, and any script under `scripts/` that names the deleted packages by path or by package name.
- **`scripts/cloudflare-release-contract.mjs`** if it references them.
- **`tsconfig`** path mappings or project references, if any.

Do not chase references in `docs/`, `.claude/`, or `.agents/` — a separate pass
owns the documentation, and editing it here would collide.

## Hard "do not"

- Do not delete `packages/account`, `packages/platform`, or `packages/workspace` — they are the replacements.
- Do not migrate an application call site. If one still exists, the precondition failed; stop and report.
- Do not add a compatibility shim, re-export, or alias to soften the deletion.
- Do not touch `apps/**` source files except a `package.json` dependency entry or a `next.config.ts` `transpilePackages` array.
- Do not add `eslint-disable`; do not use `as any`.
- Do not hand-edit `pnpm-lock.yaml`. Run `pnpm install --no-frozen-lockfile` after the manifests change, and retry rather than running two installs at once if another agent is mid-install.

## Verification — foreground, all of it

```bash
pnpm install --no-frozen-lockfile
pnpm -r --no-bail typecheck
pnpm -r --no-bail test
npx prettier --check "apps/**/*.{ts,tsx}" "packages/**/*.{ts,tsx,json}"
grep -rn "@876/client\|@876/sdk\|@876/admin" apps packages scripts .github \
  --include=*.ts --include=*.tsx --include=*.json --include=*.mjs --include=*.yml \
  | grep -v node_modules | grep -v "\.vercel/"
test -d packages/client && echo "STILL PRESENT: client"; \
test -d packages/sdk && echo "STILL PRESENT: sdk"; \
test -d packages/admin && echo "STILL PRESENT: admin"; echo "deletion check done"
```

The grep must return nothing. Typecheck must be **0 errors across every
workspace project**.

**Known pre-existing failures on `main`, which are NOT yours to fix** — confirm
these and only these still fail, and say so explicitly in your report:

- `apps/api` — 4 (`src/seeds/app-access.test.ts` ×2, `src/services/__tests__/workspace-work.test.ts` ×2)
- `apps/couriers-api` — 2 (`src/http/auth/guards.test.ts`, `src/modules/tenants/__tests__/tenants.test.ts`)
- `apps/couriers` — 3 (`settings/page.test.tsx`, `warehouse-form.test.tsx` ×2)
- `.claude/rules/access-control.md` fails `prettier --check`

Any **new** failure is yours. Do not rationalise one as pre-existing without
checking it against `origin/main`.

## Report

Write `.claude/reports/codex/2026-08-30-delete-legacy-client-packages.md`: the
precondition grep output that authorised the deletion; every file changed
outside the three deleted packages, with a one-line reason; every root script,
CI job, and config entry retargeted or removed; the full per-project typecheck
and test summary; the verbatim output of every verification command; and an
explicit statement that the only failing tests are the nine listed above.
