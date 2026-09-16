# Brief 14a-tests — close the phase 14 API test floor

Repo `/root/projects/876`. Write tests only (production code changes only if a test exposes a real defect — then report it). No commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch only `apps/projects-api/src/modules/{collaboration,discussions,wiki,portal}/**` and `packages/projects/src/**` tests. Another agent edits `apps/projects/**`.

Brief 14a required ≥ 100 new API tests; 54 were written (see `plans/sep/16-projects-phase-14/reports/codex/14a-api.md`). Add **≥ 50 more meaningful `it()`** per `.claude/rules/testing.md`, prioritising:
- route-level (supertest over assembled routers) auth for every collaboration/discussion/wiki/client-grant/portal route: missing key 401, wrong tenant 404, strict body 422;
- portal: each of the 7 serializers against a row with every internal field populated (assert absent), `clientVisible=false` excluded for phases/work items/files/comments/discussions, time hours-by-phase rounding, invoice list via finance public API mocked;
- client-visibility PATCH for each record type incl. permission-less caller;
- mention parser security corpus (`<script>`, `__proto__`, unicode RTL, 10k chars) and malformed tokens;
- wiki reparent to descendant (cycle), restore of a missing revision, slug normalisation edge cases;
- activity cursor across equal `createdAt`.

## Verify
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api test

## Report
`plans/sep/16-projects-phase-14/reports/codex/14a-tests.md` with the counted new `it()` and any defects found.
