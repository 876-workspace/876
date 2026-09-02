# Provisioning Phase 2 — exhaustive routing, persistence, entitlement, and retry test brief

## Mission

Test the Phase 2 provisioning selection and application path **adversarially and exhaustively** on the current branch.

This is a platform-boundary test task. The goal is not to prove that the happy path works. The goal is to make it very difficult for a future change to silently:

- route an organization to the wrong provisioning setup,
- re-route an organization on retry,
- select an unpublished or inactive setup,
- bypass the single fallback invariant,
- apply the wrong currency/language/finance defaults,
- grant or remove product access incorrectly,
- create Work when the service gate is disabled,
- grant Work scopes that the setup or consuming app does not allow,
- lose the audit trail explaining why a setup was selected,
- make an existing organization drift when routing rules change,
- partially apply provisioning after a failure,
- make retries non-idempotent,
- regress signup/admin organization creation/backfill behavior.

Do not stop at coverage percentages. Treat this as a decision engine, persistence boundary, and provisioning orchestration system that needs mutation-resistant behavioral tests.

## Mandatory rules to read first

Read these before changing tests or production code:

- `CLAUDE.md`
- `.claude/rules/testing.md`
- `.claude/rules/types.md`
- `.claude/rules/performance.md`
- `.claude/rules/code-structure.md` if present
- `.claude/rules/api.md` / HTTP rules if present
- `docs/handoff/2026-08-31-provisioning-phase-2-handoff.md`
- `docs/architecture/016-provisioning-manifests.md`
- `docs/architecture/019-work-service.md` or the current Work ADR

The repository's testing rules are authoritative. In particular:

- Arrange → Act → Assert → After.
- One act per test.
- Exact result assertions.
- Exact dependency call counts and exact call arguments.
- Negative-space assertions (`not.toHaveBeenCalled()`).
- Every meaningful branch/error path must be exercised.
- Tests must be deterministic.
- Do not use `as any`.
- Prefer public contracts over private implementation details.

## Current implementation surfaces to inspect

At minimum inspect all of these before writing tests:

### Shared contracts

- `packages/core/src/types/provisioning-policy.ts`
- `packages/core/src/types/provisioning-selection.ts`

### Selection engine

- `apps/api/src/modules/provisioning/provisioning-selection.service.ts`
- `apps/api/src/modules/provisioning/provisioning-selection.repository.ts`
- `apps/api/src/modules/provisioning/index.ts`

### Setup policy

- `apps/api/src/modules/provisioning/provisioning-setup-policy.*`
- existing provisioning-policy schema/service/route tests

### Organization integration

- `apps/api/src/services/provisioning-policy.ts`
- `apps/api/src/services/provisioning-policy.repository.ts`
- `apps/api/src/services/provisioning.ts`
- `apps/api/src/services/provisioning.repository.ts`
- `apps/api/src/services/workspace.ts`
- `apps/api/src/services/organization-bootstrap.ts`
- `apps/api/src/services/organization-bootstrap.repository.ts`
- `apps/api/src/services/auth.ts`
- `apps/api/src/services/auth.repository.ts`
- `apps/api/src/modules/organizations/**`

### Finance provisioning

- `apps/api/src/services/finance-provisioning.ts`
- `apps/api/src/services/finance-provisioning.repository.ts`
- `apps/api/src/services/finance-provisioning-readiness.ts`
- provisioning run/retry modules and tests

### Work

- `packages/work/src/integration-scopes.ts`
- `packages/work/src/operator.ts`
- `apps/api/src/services/workspace.ts`
- Work service provisioning/integration tests

### Database models/migration

- `apps/api/prisma/schema/provisioning-setup.prisma`
- `apps/api/prisma/schema/provisioning-setup-condition.prisma`
- `apps/api/prisma/schema/provisioning-setup-entitlement.prisma`
- `apps/api/prisma/schema/organization.prisma`
- `apps/api/prisma/schema/provisioning-run.prisma`
- the Phase 2 provisioning-selection migration on this branch

## Core routing contract that tests must pin

The resolver receives canonical facts of this shape:

```ts
{
  country: string | null
  subdivision: string | null
  jurisdiction: string | null
}
```

The expected routing semantics are:

```text
OR between condition groups
AND inside a condition group
specificity > configured priority > deterministic lexical tie-break
exactly one active published default when no policy matches
persist the chosen setup once
never silently re-route an existing organization
```

The current supported condition operator is `equals` only.

Do **not** normalize this into a generic rules engine in tests. Test the product contract above.

---

# Required test campaign

## 1. Pure resolver — basic country routing

Add focused tests for `resolveProvisioningSetupFromCandidates()` or the current pure resolver contract.

Required cases:

- `JM` matches Jamaica.
- `US` matches United States.
- `CA` matches Canada.
- every Caribbean country/territory represented by the one-time Phase 1 bootstrap file matches its expected setup/group.
- lowercase country input is normalized.
- surrounding whitespace is normalized.
- empty string becomes no signal.
- whitespace-only string becomes no signal.
- `null` country is handled.
- `undefined` country is handled.
- unknown country falls back rather than throwing when one valid fallback exists.
- a country match beats fallback.
- inactive setups never enter the candidate set at the repository integration layer.
- setups without a published finance revision never enter the candidate set.

Where regional bootstrap data exists, prefer a data-driven `it.each` matrix derived from the checked-in specification rather than manually duplicating every code.

## 2. OR-group semantics

Prove separate `group_key` values are OR alternatives.

Example setup:

```text
group=barbados: country=BB
group=trinidad: country=TT
group=guyana: country=GY
```

Required assertions:

- BB matches the setup.
- TT matches the setup.
- GY matches the setup.
- JM does not match it.
- a failed group does not poison another matching group.
- the winning `match_group_key` is exactly the group that matched.
- audit `matched_fields` contains exactly the fields in that winning group.

## 3. AND semantics inside a group

Use a setup with:

```text
country=US
subdivision=US-CA
```

Required cases:

- `{ US, US-CA }` matches.
- `{ US, US-NY }` does not match.
- `{ CA, US-CA }` does not match.
- `{ US, null }` does not partially match.
- `{ null, US-CA }` does not partially match.
- adding a `jurisdiction` condition requires all three facts.
- condition ordering in the database does not change the result.

Pin that **partial groups never count**.

## 4. Specificity ordering

Create overlapping candidates and prove:

```text
country
< country + subdivision
< country + subdivision + jurisdiction
```

Required cases:

- a 2-field match beats a 1-field match even when the 1-field rule has much higher priority.
- a 3-field match beats a 2-field match even when the 2-field rule has much higher priority.
- specificity is based on distinct matched fields, not duplicate condition count.
- duplicate same-field conditions must not artificially increase specificity.
- if malformed historical rows somehow contain duplicate fields, the resolver remains deterministic and does not count them twice.

This invariant is security/financially important: priority must never allow a generic rule to override a more specific jurisdiction rule.

## 5. Priority ordering

For equally specific matches:

- higher priority wins.
- zero beats negative priority if negatives are allowed by current schema; otherwise validate/reject negatives at schema level and test that.
- equal priority falls through to deterministic lexical ordering.
- changing priority changes the winner only when specificity is equal.
- returned `match_priority` is exactly the selected group's configured priority.

If group conditions are required to share one priority, add schema/service tests proving mixed priorities inside the same group are rejected or normalized according to the current contract.

## 6. Deterministic tie-break

Build two or more otherwise identical candidates.

Required properties:

- candidate input order does not change the winner.
- condition row order does not change the winner.
- setup lexical order is the final cross-setup tie-break.
- group lexical order is the final within-setup tie-break.
- repeated calls with the same logical candidate set return byte-for-byte equivalent selection output.

Run the same logical candidate set through several permutations. Use deterministic permutations, not random test order.

## 7. Normalization corpus

Test canonicalization separately from matching behavior.

At minimum:

```text
'jm'       -> 'JM'
' JM '     -> 'JM'
'us-ca'    -> 'US-CA'
' US-CA '  -> 'US-CA'
''         -> null
'   '      -> null
```

For jurisdiction, pin the intended case-sensitivity exactly. If jurisdiction is intentionally opaque/case-sensitive, test that. If it should normalize, fix the implementation and document the decision.

Test malformed runtime inputs where TypeScript cannot protect the boundary if the public service can receive them.

## 8. Fallback invariants

Required failures:

- zero active/published candidates -> `provisioning/setup-unavailable`.
- zero default candidates after no match -> `provisioning/setup-fallback-invalid`.
- two default candidates after no match -> `provisioning/setup-fallback-invalid`.
- an inactive default cannot rescue routing.
- an unpublished default cannot rescue routing.
- a valid policy match succeeds even if fallback would otherwise be invalid **only if this is the intended contract**. Inspect current behavior and pin it explicitly.

Assert full `AppHttpError` observable fields required by repo convention: code, message, HTTP status.

## 9. Published-manifest eligibility

Repository/integration tests must prove selection only considers setups whose finance manifest has a published revision.

Test:

- setup with draft only is excluded.
- setup with no manifest is excluded.
- setup with application manifest but no finance manifest is excluded.
- setup with published finance revision is included.
- archived/inactive setup with published finance revision is excluded.
- multiple revisions do not create duplicate candidates.

Do this at the repository/database integration layer, not by mocking the pure resolver.

## 10. Workspace defaults extraction

For `retrieveProvisioningWorkspaceDefaults()` test exact parsing of manifest v1 workspace properties.

Required cases:

- `defaultCurrency` wins when present.
- `baseCurrency` is the fallback when `defaultCurrency` is absent.
- missing both currencies -> stable invalid-profile error.
- missing language -> stable invalid-profile error.
- country may be null for global USD fallback.
- country reference is returned when present.
- reference values use `referenceKey`, not display labels.
- currency is normalized uppercase.
- finance revision id/revision are exact.
- missing workspace/default resource -> stable missing-profile error.
- published revision with unrelated resources only -> missing-profile error.

## 11. Persist-once semantics

This is a critical invariant.

Test the organization persistence service/repository so that:

- first selection persists setup key + type + group + priority + matched fields + selected timestamp.
- a second ordinary retry does not overwrite an existing selection.
- retry does not call the resolver when a persisted setup exists.
- retry continues using the old setup even after routing policy would now choose another setup.
- retry continues using the old setup after platform fallback changes.
- persisted setup lookup failure produces an explicit provisioning error rather than silent re-resolution, unless the handoff specifies a repair path.
- policy mutation after assignment never changes the organization's setup automatically.

Use exact dependency call assertions to prove the resolver is **not called** on persisted retry paths.

## 12. Existing-organization backfill

Backfill is explicit and must be separately typed/audited.

Required cases:

- organization with no persisted setup can be backfilled once.
- backfill stores `selection_type = backfill` or the exact current enum.
- backfill does not overwrite an already-selected organization.
- rerunning backfill is idempotent.
- country-only historical organization resolves correctly.
- region/subdivision historical organization uses canonical region code.
- organization with no location falls back.
- malformed/missing default setup causes backfill to fail without partial persistence.
- backfill report/result accurately counts selected/skipped/failed rows if a batch command exists.

If backfill runs in batches/cursors, test cursor boundaries, final partial batch, empty set, and rerun.

## 13. Organization creation integration

Test every organization-creation path that Phase 2 changes:

- business registration,
- existing-user organization bootstrap,
- admin/API organization creation,
- product-app onboarding if it has its own creation path.

For each path prove:

1. routing facts are built from the canonical request/organization data,
2. resolver is called exactly once for a brand-new organization,
3. selected setup is persisted before product/finance/Work provisioning,
4. organization currency/language are taken from selected workspace defaults,
5. country is preserved from authoritative organization input when present,
6. the selected setup key is durable,
7. downstream provisioning receives the persisted setup/policy,
8. a failure after selection can retry without resolving again.

Do not accept tests that merely assert an organization row exists.

## 14. Signup country selector / contract

If Phase 2 exposes country in the shared business signup UI/API/SDK, test all layers:

### UI

- renders canonical countries from `@876/core/countries.json`.
- arbitrary country text cannot be submitted.
- selected country reaches the SDK exactly.
- keyboard selection works.
- accessible label/name exists.
- empty required selection blocks submission if required.

### SDK/account client

- accepts the country field using the final contract name.
- validates canonical two-letter country code.
- rejects malformed/unknown code if the schema requires known countries.
- sends the exact payload to `/auth/register-business`.

### API

- request schema accepts valid country.
- invalid body rejected before service call.
- service receives exact country.

Do not reintroduce free-text country inputs.

## 15. Provisioning-driven application entitlements

For a selected setup policy test:

- Enterprise is always included.
- enabled CRM is subscribed.
- disabled CRM is not subscribed unless it is the explicit source app being requested.
- disabled Billing does not grant standalone Billing access.
- disabled Invoice does not grant standalone Invoice access.
- finance infrastructure can still be created without Billing/Invoice app entitlement.
- source app is added exactly once even if already enabled by the setup.
- duplicate entitlement rows cannot cause duplicate subscriptions.
- missing app registry row follows the documented behavior and logs/errors appropriately.
- retry does not duplicate subscriptions or subscription items.
- existing customized subscription price is never replaced by provisioning.

## 16. Finance separation

Test the architectural distinction:

```text
shared finance workspace != Billing app entitlement
shared finance workspace != Invoice app entitlement
```

Required cases:

- organization with Enterprise only can still receive required shared finance infrastructure according to the architecture.
- enabling Billing app does not change which setup was selected.
- enabling Invoice app does not change which setup was selected.
- finance setup key comes only from the persisted provisioning selection.
- finance retry never assigns the current platform default to an unassigned organization implicitly after Phase 2.
- missing persisted selection on a Phase-2 organization produces the intended repair/error path, not silent drift.

## 17. Work service gate

For `service/work`:

- enabled -> Work tenant ensure is attempted.
- disabled -> Work tenant ensure is not called.
- disabled Work + enabled capability rows still results in no Work tenant.
- enabled Work with every capability disabled creates only the tenant behavior intended by the contract and grants no app scopes.
- Work not configured in environment follows the explicit current error/degradation policy; pin it with tests.
- Work API error/rejection follows the retryable provisioning behavior.
- Work error must not change the persisted setup selection.

## 18. Work capabilities -> scopes

Test every capability mapping independently:

```text
work.tasks
work.reminders
work.calendars
work.events
work.alerts
work.my-work
work.sync
```

For each capability:

- enabled capability contributes exactly its intended scope(s).
- disabled capability contributes none.
- Work gate disabled makes the final scope set empty.
- duplicate capability rows do not duplicate scopes.
- unknown capability rows are rejected before reaching this path under normal APIs; if historical data can bypass validation, prove the resolver safely ignores/rejects it according to current design.

Use exact array/set expectations.

## 19. App Work-scope intersection

Provisioning may narrow an app's Work access but may never expand the consuming app's declared integration grant.

For CRM:

```ts
finalScopes = CRM_DECLARED_SCOPES ∩ SETUP_ENABLED_WORK_SCOPES
```

Required cases:

- all Work capabilities enabled -> CRM receives exactly CRM's declared integration scopes.
- only tasks enabled -> CRM receives only task scopes it declares.
- capability enabled that CRM does not declare -> CRM does not receive it.
- Work disabled -> CRM receives zero Work scopes.
- non-Work app receives zero Work scopes.
- future/unknown app slug receives zero scopes by default.

Mutation target: a change from intersection to union must make tests fail.

## 20. Provisioning-run audit fields

When a provisioning run is created after selection, assert that the run captures the selected setup audit needed to reconstruct the decision.

Pin exact fields added by Phase 2, including as applicable:

- setup key,
- selection type,
- match group,
- match priority,
- matched fields,
- selected-at timestamp,
- finance revision id/revision.

Test both first run and retry run.

A later change to setup policy must not retroactively alter old run audit values.

## 21. Retry/idempotency matrix

For each downstream stage simulate failure and retry:

- after organization row created but before selection persisted,
- after selection persisted but before membership,
- after membership but before app subscription,
- after subscriptions but before finance readiness,
- during finance readiness,
- after finance before Work,
- during Work tenant creation,
- during Work app connection,
- after all provisioning but before auth session/login completion.

For each retry assert:

- no duplicate organization,
- no duplicate selection,
- no changed setup,
- no duplicate membership,
- no duplicate subscription,
- no duplicate subscription item,
- no duplicate Work tenant/connection beyond idempotent API behavior,
- correct operation resumes,
- final state is identical to clean one-pass success.

Use injected dependencies/unit tests where possible, and DB integration tests for uniqueness/idempotency that depends on actual constraints.

## 22. Concurrency/race tests

Where feasible with the test database, issue concurrent attempts for:

- two initial selection persistence attempts for the same organization,
- two provisioning retries,
- two subscription creation attempts,
- backfill racing with ordinary retry.

Expected result must be deterministic and unique.

If exact concurrency is impractical in the current harness, test repository atomic conditions directly and document the untested race in the brief output. Do not pretend a sequential test proves concurrency.

## 23. Policy mutation tests

After an organization has selected Setup A:

- edit Setup A's routing conditions -> org remains A.
- add a more specific Setup B -> org remains A.
- increase B priority -> org remains A.
- switch platform fallback -> org remains A.
- archive Setup A -> define and pin expected behavior for existing orgs; do not silently re-route.
- publish a new finance revision for Setup A -> test whether future provisioning uses the new revision according to the intended manifest semantics while retaining Setup A identity.

The distinction between **setup identity** and **manifest revision applied** must stay explicit.

## 24. Malformed/historical data defensive tests

Even with DB constraints, test service behavior for mocked historical/bad rows where useful:

- unknown condition field,
- unknown operator,
- duplicate condition ids,
- duplicate fields in one group,
- mixed priorities in one group,
- unknown entitlement target type,
- unknown Work capability,
- missing Enterprise entitlement,
- multiple default candidates,
- no default,
- empty condition list,
- setup with entitlements but no conditions.

Do not weaken types just to construct invalid fixtures. Use `as unknown as T` only where the testing rules explicitly permit intentional invalid runtime data.

## 25. Security/adversarial input corpus

Apply the repo security input corpus to externally supplied routing strings where the API permits them:

```text
<script>alert(1)</script>
' OR '1'='1
../../etc/passwd
__proto__
NUL / unicode direction markers
10,000-character string
```

Expected behavior should be schema rejection or safe non-match, never execution/interpolation.

Also test mixed Unicode/case/whitespace inputs around country/subdivision if they can enter through HTTP.

## 26. No-network unit tests

Pure resolver/service unit tests must not require:

- real Prisma database,
- Work API,
- Billing API,
- WorkOS,
- network,
- system clock,
- random IDs.

Inject/mocks must be exact and deterministic.

Use DB integration tests only for behavior that genuinely depends on Prisma queries, relations, uniqueness, transactions, or migrations.

## 27. Real HTTP stack tests

For new/changed HTTP routes, use the assembled Express app/middleware chain according to the repo testing rules.

Do not only invoke controllers directly.

Test:

- auth/permission boundary,
- invalid JSON/body,
- unknown fields,
- valid payload,
- service/domain errors,
- unexpected errors,
- exact HTTP status,
- exact response envelope,
- exact service calls,
- analytics/logging expectations required by local route convention.

## 28. React test harness regression from PR #449

The Phase 2 handoff identifies the Console test-environment failure involving:

```text
React.act is not a function
```

Muse must:

- reproduce the failure on the branch,
- inspect the Console Vitest/jsdom/React Testing Library setup,
- fix the test environment at the correct shared boundary rather than adding per-test hacks,
- verify provisioning Console tests run under React 19,
- add/regress a test that would fail if the harness regresses,
- avoid monkey-patching production React behavior.

Do not mark Phase 2 tests complete while the provisioning test suite cannot execute reliably.

## 29. CRM feature-layer lint regression from PR #449

The handoff also identifies a CRM feature-layer import/lint violation.

Muse must:

- reproduce the lint failure,
- identify the forbidden sibling feature import,
- refactor through the allowed shared/public boundary,
- add or retain tests proving behavior did not change,
- run the relevant boundaries/lint command.

Do not disable the rule.

## 30. Migration/schema verification

Do not blindly regenerate migrations.

Inspect the checked-in Phase 2 migration and assert it matches Prisma schema intent for:

- organization selection audit fields,
- provisioning-run audit fields,
- indexes/constraints/defaults,
- nullable/backfill-safe rollout,
- no manifest version bump.

If using a test database, prove migration from a representative Phase 1 schema preserves existing rows.

Required migration cases:

- existing organizations survive with null new audit fields,
- new organizations can persist full selection audit,
- old provisioning runs remain readable,
- new runs store selection audit,
- rollback/forward assumptions are documented if the repo does not test down migrations.

## 31. One-time Phase 1 import compatibility

The Phase 2 routing tests must consume or validate the one-time Phase 1 provisioning bootstrap specification enough to prove its policies are routable.

At minimum:

- every declared target country has a matching condition group,
- the configured fallback has no false country identity,
- exactly one fallback is configured after import,
- every setup used for routing has a published finance manifest,
- every setup has Enterprise enabled,
- Work gate/capability rows satisfy policy invariants,
- US/Canada/Caribbean expected currencies and language defaults parse correctly.

Do not make production runtime depend on the temporary import file.

---

# Property/invariant testing

In addition to example tests, add deterministic invariant tests over generated candidate matrices.

Do **not** add a property-testing dependency automatically. First inspect workspace dependencies and repo conventions. If `fast-check` or an equivalent is already available and allowed, it may be used. Otherwise implement small deterministic matrix/permutation generators inside the test file.

Required invariants:

1. **Permutation invariance** — shuffling candidate order does not change the selection.
2. **Condition-order invariance** — shuffling rows inside a group does not change selection.
3. **Specificity monotonicity** — adding an additional matching distinct field to candidate A cannot make equally/less-specific candidate B beat A solely by priority.
4. **Unrelated-rule independence** — adding a non-matching setup does not change the winner.
5. **Fallback independence** — changing fallback identity does not affect a valid policy match.
6. **Persisted-selection stability** — changing routing candidates after persistence does not change retry selection.
7. **Work narrowing** — setup-enabled Work scopes are always a subset filter over the app-declared grant; final scopes can never contain a scope absent from the app declaration.
8. **Enterprise invariant** — effective application entitlement set always contains Enterprise.
9. **Idempotency** — applying the same provisioning intent twice yields the same durable state as once.

Use fixed deterministic cases/seeds so CI failures are reproducible.

# Mutation targets

Design assertions specifically so these mutations are killed:

- `every()` accidentally changed to `some()` for AND groups.
- specificity sort direction reversed.
- priority sort direction reversed.
- priority checked before specificity.
- lexical tie-break removed.
- fallback used before checking matches.
- inactive setup included.
- draft-only setup included.
- `defaultCurrency` / `baseCurrency` precedence reversed.
- persisted selection overwritten on retry.
- resolver called again on retry.
- Enterprise invariant removed.
- source app no longer added.
- disabled Billing/Invoice accidentally granted.
- Work gate ignored.
- Work capability mapping adds wrong scope.
- CRM scope intersection changed to union.
- Work provisioning errors swallowed as success.
- finance repository silently selects the current fallback for an unassigned existing organization.
- audit fields omitted from persisted organization or run.

If the repo has no mutation-testing tool, manually review tests against this mutation list. The goal is mutation resistance, not installing Stryker for its own sake.

# Test organization

Prefer focused files matching production boundaries, for example:

```text
apps/api/src/modules/provisioning/provisioning-selection.service.test.ts
apps/api/src/modules/provisioning/provisioning-selection.repository.test.ts
apps/api/src/services/provisioning-policy.test.ts
apps/api/src/services/provisioning.test.ts
apps/api/src/services/workspace.test.ts
apps/api/src/services/organization-bootstrap.test.ts
apps/api/src/services/auth.test.ts
apps/api/src/services/finance-provisioning*.test.ts
```

Use existing nearby naming/`__tests__` conventions when they differ.

Do not create one giant `provisioning-phase-2.test.ts` file.

# Required verification commands

Determine the exact workspace commands from `package.json`/Turbo configuration before running them. At minimum run the relevant equivalents of:

```bash
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/work typecheck
pnpm --filter @876/work test
pnpm --filter <api-package> typecheck
pnpm --filter <api-package> lint
pnpm --filter <api-package> test
pnpm --filter <console-package> typecheck
pnpm --filter <console-package> lint
pnpm --filter <console-package> test
pnpm --filter <crm-package> lint
pnpm boundaries
```

Then run the repo's relevant broader validation command(s) required by `CLAUDE.md`.

Where coverage tooling is configured, run coverage for the touched packages. Do **not** use a high line-coverage number as evidence that routing invariants are sufficiently tested.

# Completion bar

Do not report this brief complete until all of the following are true:

- [ ] Every resolver branch is covered with mutation-resistant assertions.
- [ ] Country OR groups are exhaustively tested for the checked-in regional data.
- [ ] Country+subdivision AND behavior is pinned.
- [ ] Jurisdiction three-level specificity is pinned.
- [ ] Specificity beats priority.
- [ ] Equal-specificity priority behavior is pinned.
- [ ] Deterministic tie-break is permutation-tested.
- [ ] Fallback zero/multiple/default cases are pinned.
- [ ] Inactive/unpublished setups cannot route.
- [ ] Workspace currency/language parsing is fully tested.
- [ ] Persist-once behavior is proven.
- [ ] Retry never silently re-resolves.
- [ ] Explicit backfill is idempotent and audited.
- [ ] All organization creation paths are covered.
- [ ] Application entitlements are covered, including explicit source app.
- [ ] Billing/Invoice access remains separate from finance infrastructure.
- [ ] Work gate is covered.
- [ ] Every Work capability mapping is covered.
- [ ] App-declared Work scope intersection is covered.
- [ ] Provisioning-run audit fields are covered.
- [ ] Partial-failure retry matrix is covered.
- [ ] Relevant DB uniqueness/concurrency cases are covered.
- [ ] Phase 2 migration is verified against existing Phase 1 data.
- [ ] One-time Phase 1 regional import remains compatible.
- [ ] PR #449 Console React test harness failure is fixed and regression-tested.
- [ ] PR #449 CRM feature-layer lint failure is fixed without disabling boundaries.
- [ ] Relevant typecheck/lint/test/boundary commands pass.
- [ ] No skipped tests, `.only`, TODO assertions, shallow `toBeDefined()` certificates, or silent caught errors remain.

# Deliverable

When finished, write a concise test report under `docs/handoff/` containing:

1. files/tests added or changed,
2. exact invariant matrix covered,
3. defects discovered in production code,
4. production fixes made because of those tests,
5. commands run and their results,
6. any test that could not be executed and the exact reason,
7. remaining risk areas,
8. a short mutation-resistance assessment against the mutation list above.

Do not open a PR as part of this brief unless explicitly instructed later.
