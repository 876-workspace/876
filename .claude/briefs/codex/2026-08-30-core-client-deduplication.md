# Brief — remove the duplicated Core client implementation

Model: `gpt-5.6-terra`, `model_reasoning_effort=high`.
Branch: `refactor/bounded-service-clients` (already checked out; do not branch, commit, rebase, merge, or open a PR).

## The problem

The bounded-client migration (ADR `docs/architecture/020-bounded-service-clients-and-application-bffs.md`)
introduced `@876/account` and `@876/platform` by **copying** `@876/sdk` and
`@876/admin` rather than moving them. Verify it yourself:

```bash
diff -rq packages/sdk/src packages/account/src      # only index.ts differs, + 2 new files
diff -rq packages/admin/src packages/platform/src   # only index.ts differs, + 2 new files
```

Roughly 8,000 lines of Core client — request layer, runtime, every resource
module, every contract type — now exist **twice**, and both copies are live:
`@876/sdk` and `@876/admin` are still imported by `apps/console`,
`apps/enterprise`, `apps/876`, `packages/client`, `packages/ui`, `packages/core`
and `packages/device`. Any fix applied to one copy silently misses the other.

## The goal

**One implementation, no behaviour change, every existing consumer still compiles.**

`packages/account` and `packages/platform` become the sole homes of the Core
client implementation. `packages/sdk` and `packages/admin` are reduced to
**thin compatibility re-export shims** over them, containing no implementation
of their own. They are deleted later, once the remaining apps migrate — that is
a separate pass and is **not** in scope here.

Concretely, when you are done:

- `packages/sdk/src/**` and `packages/admin/src/**` contain **no** resource
  implementation, request layer, runtime, or type declaration — only re-exports.
- `git grep -c "" packages/sdk/src packages/admin/src` is a small number.
- Every symbol the old packages exported is still exported, with the same name
  and the same type. Nothing that compiles today stops compiling.

## How to get there

Prefer `git mv` where a file moves wholesale, so history follows the code.

The two packages differ in how much surface has to be preserved:

### `@876/sdk` → `@876/account`

`packages/account/src/index.ts` is `packages/sdk/src/index.ts` with the account
projection added and **some exports dropped** (apps, audit events, OAuth grants,
`RoutingMembership`, others — diff the two files and enumerate them). `@876/sdk`
consumers still need those.

Do **not** re-add them to `@876/account`'s root if the ADR deliberately excluded
them from the Account concept. Instead give `@876/account` a **`./compat`**
entrypoint that re-exports the exact historical `@876/sdk` root surface, and
make `packages/sdk/src/index.ts` a one-line re-export of it. The other
`@876/sdk` subpaths (`./client`, `./oauth`, `./errors`) become one-line
re-exports of the matching `@876/account` entrypoints — add `@876/account`
entrypoints where one is missing.

### `@876/admin` → `@876/platform`

`packages/platform/src/index.ts` dropped roughly 180 lines of type exports that
`packages/admin/src/index.ts` still has (`AdminOnboarding*`, `AdminJsonValue`,
`AdminAuditEventCreateParams`, and many more). About 160 Console files import
those types. Same treatment: a `@876/platform/compat` entrypoint carrying the
historical `@876/admin` root surface, with `packages/admin/src/index.ts`
re-exporting it.

`packages/platform/src/client.ts` still carries `@876/admin`-era doc comments
that reference `@876/client/server` and "Admin API client factory". Update the
prose to describe the platform package. Do **not** rename the exported symbols
in this pass — `create876AdminClient` stays as-is so `@876/client` keeps working.

## Also fix, while the code is in front of you

`packages/platform/src/internal.ts` and `packages/account/src/internal.ts` are
what `@876/workspace` imports. Confirm both still resolve after the move and that
`@876/workspace/session` and `@876/workspace/operator` typecheck.

## Hard "do not"

- Do not delete `packages/sdk` or `packages/admin`. They must keep working.
- Do not change any exported symbol's **name** or **type**. This pass is a move, not a rename.
- Do not change runtime behaviour, request paths, headers, credentials, or auth tiers.
- Do not touch `apps/**` at all. Every application must compile **unchanged**.
- Do not touch `packages/crm/**` or `apps/crm/**` — another change is in flight there.
- Do not add `eslint-disable`, and do not use `as any` (`as unknown as T` only, with a comment).
- Do not hand-edit `pnpm-lock.yaml`; run `pnpm install --no-frozen-lockfile` if a manifest changes.
- Do not create a barrel that re-aggregates unrelated domains.

## Verification — foreground, and report the real output

```bash
pnpm --filter @876/account typecheck && pnpm --filter @876/account test
pnpm --filter @876/platform typecheck && pnpm --filter @876/platform test
pnpm --filter @876/workspace typecheck
pnpm --filter @876/sdk typecheck && pnpm --filter @876/sdk test
pnpm --filter @876/admin typecheck
pnpm --filter @876/client typecheck
pnpm --filter @876/core typecheck
pnpm --filter @876/ui typecheck
pnpm --filter @876/app typecheck
pnpm --filter @876/enterprise typecheck
pnpm --filter @876/console typecheck
npx prettier --check "packages/{sdk,admin,account,platform,workspace}/**/*.{ts,json}"
```

Every one must pass. `@876/console` and `@876/app` passing **unchanged** is the
real proof the shims are faithful — if you find yourself editing an app to make
a check pass, the shim is wrong, so fix the shim instead.

Then prove the duplication is gone:

```bash
diff -rq packages/sdk/src packages/account/src
diff -rq packages/admin/src packages/platform/src
```

Both must now report the old packages as containing only the shim files.

## Report

Write `.claude/reports/codex/2026-08-30-core-client-deduplication.md`: what moved
where; the exact list of symbols the new root entrypoints had dropped and how
`./compat` restores them; every entrypoint added to `@876/account` /
`@876/platform`; line counts of `packages/sdk/src` and `packages/admin/src`
before and after; the verbatim output of every verification command; and
anything you deliberately left alone.
