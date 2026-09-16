# Report 14a-tests — Phase 14 API test floor

- Status: complete, all verifications green.
- Scope: tests only. 11 new files under `apps/projects-api/src/modules/{collaboration,discussions,wiki,portal}/__tests__/`. Zero production changes, no commit/branch/push, no `eslint-disable`/`as any`/`@ts-ignore`.
- Floor: ≥ 50 new meaningful `it()` (prior session: 54). Delivered **208 new `it()`** (55 → 66 files, 1167 → 1375 tests).

## New tests by file

- `collaboration/__tests__/collaboration-routes.test.ts` (14): route-level activity + followers auth — missing/wrong key 401, unknown tenant/project 404, strict query/body 400, happy-path envelopes (201 follow, list envelope).
- `discussions/__tests__/discussion-routes.test.ts` (31): all 10 discussion/post routes — 401 per route, unknown tenant/project/discussion/post 404, strict/empty-body 400, locked-discussion 409, visibility PATCH true/false with exact repository args.
- `wiki/__tests__/wiki-routes.test.ts` (25): all 8 wiki/revision routes — 401 per route, unknown tenant/project/page/revision 404, strict/empty-body/malformed-slug 400, slug-derivation and revision-append assertions.
- `portal/__tests__/portal-routes.test.ts` (34): guard (no key / no user 401, revoked grant 404 without leaking, unknown tenant/project 404, strict query 400) plus `describe.each` over all 14 portal routes (401 + granted 200 each).
- `portal/__tests__/grant-attachment-routes.test.ts` (25): all 5 client-grant + 6 attachment-link routes — 401 per route, strict/empty-body 400, exact service args, visibility PATCH true.
- `collaboration/__tests__/mentions-security.test.ts` (13): `<script>`/event-handler labels, `__proto__` without prototype pollution, unicode RTL marks, 10k-char body, 2k-token dedupe, unclosed/empty/whitespace/multiline ids, scheme mismatches, nested parens, empty labels.
- `wiki/__tests__/wiki-edges.test.ts` (13): slugify edges (collapse, strip, empty/symbol-only → `page`, digits), strict `isValidSlug` matrix, reparent-to-grandchild + self-parent cycle rejection, unrelated-move allow, missing-parent 404, multi-hop `wouldCreateCycle`, restore of missing page/revision 404 with no writes.
- `collaboration/__tests__/activity-cursor.test.ts` (7): equal-`createdAt` ordering and limit+1 cursor stability, opaque cursor forwarded untouched, tenant 404, colon-bearing id round-trip, fractional/negative/empty cursor rejection.
- `portal/__tests__/portal-serializers-extended.test.ts` (9): 7 serializers (+ discussion-post) against fully populated internal rows with exact `toEqual` output — assignee/estimate/tenant/position/locked/author/postCount/revisionCount/createdBy/visibility internals all absent.
- `portal/__tests__/portal-visibility.test.ts` (23): visible-query delegation with exact args, error propagation per surface, flag-denied paths never touching underlying modules, all-hidden discussion page, hidden-attachment exclusion, wiki allow-flag gating, time rounding (1m→0.02, 7m→0.12, 61m→1.02, null skipped, unknown phase → null, desc sort), invoice minutes→hours via mocked finance API (90m→1.5), activity subject filtering + scope forwarding.
- `portal/__tests__/client-visibility.test.ts` (14): visibility PATCH service behavior for all six record types (work items, comments, phases, phase comments, discussions, files) — publish + hide, unknown subject 404 with no write.

## Verification (in order)

- `pnpm --filter @876/projects-api typecheck` — exit 0.
- `pnpm --filter @876/projects-api lint` — exit 0, zero warnings.
- `pnpm --filter @876/projects-api test` — 66 files / 1375 passed.

## Notes / discrepancies (no defects found)

- The brief asked for "strict body 422" — the app maps every Zod validation failure to `projects/invalid-request` (HTTP 400) via the shared `errorHandler`. Route tests therefore assert 400 + `projects/invalid-request` for strict-body violations. This is consistent platform-wide (same as automation/custom-fields route tests), not a defect.
- The brief asked for "`clientVisible=false` excluded for phases/work items/files/comments/discussions" — wiki is correctly absent from that list: wiki pages carry no per-record visibility flag (gated only by the grant `allowWiki` flag), so there is nothing to exclude. Covered by wiki allow-flag denial tests instead.
- No production defects exposed; no production code touched.
