# Continuation: Billing API + `@876/billing` document templates and branding

Working directory `/root/projects/876-invoice-branding`. Same prohibitions as the original brief (no commits, branches, pushes; no database-connecting commands). Another agent is concurrently editing `packages/billing-ui/` — do not touch it or any `apps/*` other than `apps/billing-api`.

1. Read the original brief: `plans/2026-09-15-document-templates-and-branding/briefs/codex/2026-09-15-billing-api-document-templates.md`.
2. Read your stopped report: `plans/2026-09-15-document-templates-and-branding/reports/codex/2026-09-15-billing-api-document-templates.md`.
3. **The blocker is fixed**: `contrastRatio` in `packages/core/src/lib/branding/index.ts` no longer destructures, and `pnpm --filter @876/billing-api typecheck` currently reports 0 errors with your partial slice in place.
4. Review the files you already wrote against the original brief, then finish **every** remaining deliverable: all routes for both tiers, service rules, the OpenAPI artifact regeneration, the SDK resources, and all test floors (≥18 service/repository, ≥14 Supertest routes, ≥10 SDK).
5. `DELETION_MODE`: you added config handling. Declare it in `apps/billing-api/.env.example` with `# optional — defaults to soft in production, hard elsewhere` (see `.claude/rules/env-configuration.md`). If the service already has another deletion-policy mechanism, use that instead and remove your addition.
6. Run every verification command from the original brief, one at a time, in the foreground, and fix what you broke.
7. **Overwrite** the report file with the final report (keep a short "Attempt 1 stopped on a core typing defect, fixed by orchestrator" line at the top).

## Attempt 2 notes

- Attempt 2 was killed by the host for low memory after writing `document-templates.{repository,service,routes}.test.ts`. Resume from the current tree; do not start over.
- **You are the only delegate running.** The host has ~3 GB free beside a dev server: run vitest scoped to the files you are working on (`pnpm --filter @876/billing-api exec vitest run src/modules/document-templates`) and run the full suite once at the end.
- `packages/billing/src/types/{branding,document-template}.ts` and their `.schema.ts` files currently fail typecheck with circular-reference errors (TS7022/TS2456: a type alias named the same as an imported type, or a schema referencing its own inferred type). Fix them first — `@876/billing-ui` is blocked on them. Reuse `brandingSchema` / `documentTemplateSettingsSchema` from `@876/core` rather than re-inferring under the same name.
- Also review `document-templates.repository.ts`: two concurrent first creates can both compute `count === 0` and both try to become default, which the partial unique index rejects as a raw Prisma error. Map that unique violation to a registered conflict error (or retry once as non-default) and test it.

## Attempt 3 notes

- Attempt 3 (terra) ran ~6 minutes, touched `document-templates.repository.ts`, its tests and `packages/billing/src/types/{branding,document-template}*`, then hit the GPT usage limit. Continue from the current tree.
