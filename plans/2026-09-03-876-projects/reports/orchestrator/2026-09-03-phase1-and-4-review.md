# Orchestrator review — phases 1 and 4

**Date:** 2026-09-03. **Reviewer:** orchestrating session.
Both phases were delegated to `agy` on `gemini-3.8-flash-high`. Neither was
accepted on its report; everything below was verified in the foreground.

## Verification actually run

| Command | Result |
| --- | --- |
| `pnpm --filter @876/core typecheck` | pass |
| `pnpm --filter @876/core test` | pass — 37 files, 962 tests |
| `pnpm --filter @876/api typecheck` | pass |
| `pnpm --filter @876/api test` | pass — 110 files, 2231 tests |
| `pnpm --filter @876/projects-api typecheck` | pass, from a deleted `src/db/generated` |
| `pnpm --filter @876/projects-api lint` | pass, no disables |
| `pnpm --filter @876/projects-api test` | pass — 2 files, 34 tests (brief floor: 24) |
| `grep -rn "eslint-disable\|@ts-ignore\|@ts-expect-error\|as any"` | clean in all new code |

Test counts moved: phase 4 added 8 `it()` cases, phase 1 added 34.

## Defects found in the delegated work, and fixed

1. **`prisma/schema.prisma` duplicated `prisma/schema/schema.prisma`.** `crm-api`
   has no such file and `prisma.config.ts` points at `prisma/schema`, so the
   stray was dead weight and a `prisma validate` hazard. Deleted.
2. **`scripts/prisma-generate.mjs` fell back to `apps/crm-api/node_modules`.**
   agy added a cross-app CLI resolution path and a `NODE_PATH` fallback to work
   around the pre-`pnpm install` state. That is a boundary violation and
   transitional code with no removal condition
   (`.claude/rules/ai-code-quality.md`). Restored to `crm-api`'s shape,
   confirmed structurally identical, and re-verified from a clean generated
   directory.
3. **`projects.project_member` was snake_case.** New multiword 876-owned object
   discriminators are kebab-case (`.claude/rules/naming.md`,
   `stripe-api-pattern.md`). Renamed to `projects.project-member` across the
   service, and the phase 1 and 2 briefs corrected — phase 2's
   `projects.issue_event` → `projects.issue-event` — so the rest of the run
   stays consistent. Zero consumers existed, so no migration was needed.
4. **The generated Prisma client was not gitignored.** Every other Prisma
   service is listed in the root `.gitignore`; `apps/projects-api/src/db/generated/`
   was missing and would have been committed. Added.
5. **A stray `apps/projects-api/.gitignore`** duplicating root rules, which
   `crm-api` does not have. Deleted.
6. **Formatting.** Two files failed `prettier --check`; formatted.

## Accepted as written

- Per-route guards, never `router.use` for auth.
- Only repositories reach Prisma; controllers and services do not.
- Errors returned as values; the one `throw` is a rethrow of an unexpected
  driver error after handling the `P2002` create race, which is allowed.
- Every projects query is tenant-scoped.
- Serializers convert `BigInt` to `number`; no `DateTime` anywhere.
- Migration creates all 8 tables with the 5 required CHECK constraints.
- Dependencies exactly as briefed — `@876/billing`, `@876/crm` and `@876/work`
  removed from the copied `package.json`.
- The permission catalog matches its brief exactly and extends the seed
  call-order expectations rather than loosening them.

## Open question for the user

The object discriminators are namespaced (`projects.project`), which
`stripe-api-pattern.md` discourages ("do not use dotted/namespaced object
discriminator values unless a specific existing contract requires them"), and
`apps/crm-api` uses undotted names (`request`, `customer_profile`). The plan
committed to the namespace and it does disambiguate generic nouns like
`project` and `tenant` across services, so it was kept rather than re-decided
mid-run. Worth settling before the client package (phase 3) fixes it in a
public contract.
