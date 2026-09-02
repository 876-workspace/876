# Brief — Park late fees, dunning escalation, and payouts behind a kill switch

## Read first

- `.claude/rules/billing-data-plane.md` → "Parked, deliberately".
- `docs/billing/README.md` → "Deliberately parked".
- `.claude/rules/express-api.md` — config is read in `src/config/` and nowhere
  else; a repository never reads settings.

## Why

Every 876 organization is on a free plan and **no money is collected**. A
feature that can only act against real money must not act at all. Late-fee
assessment currently runs whenever a tenant's `invoice_preferences.late_fees_enabled`
is true — a tenant-level switch with no platform-level authority above it. One
misconfigured preference row is enough to invoice a customer a late fee for an
amount 876 never charged them.

Parking is a setting and a written decision. **It is not a deletion.** The
calculation, the preference UI, the schema, and every test stay exactly as they
are. What changes is that a platform switch, defaulting to off, sits above the
tenant preference.

## Task 1 — the setting

`apps/billing-api/src/config/index.ts`: add

```
BILLING_LATE_FEES_ENABLED   booleanish, default false
BILLING_DUNNING_ENABLED     booleanish, default false
BILLING_PAYOUTS_ENABLED     booleanish, default false
```

surfaced on `getSettings()` as a `features` block. Reuse the existing
`WORKOS_VAULT_ENABLED` truthiness transform rather than writing a second one;
if it is worth sharing, lift it to a local `booleanish()` helper beside the
other helpers in that file and use it for all four.

## Task 2 — the choke point

`assessLateFees` in `apps/billing-api/src/modules/documents/documents.service.ts`
is the single entry point (the repository function of the same name is called
only from there). Gate it **in the service**, not the repository — the
repository must not read settings.

When the platform switch is off, return the same shape the "tenant preference
disabled" path already returns — `{ created: 0, skipped: 0, hasMore: false }` —
so no caller changes and no route breaks. Log once at `info` with a stable
message naming the switch, so an operator wondering why nothing happened finds
the answer in the logs rather than in the code.

**Precedence, stated explicitly and tested:** the platform switch ANDs with the
tenant preference. Off at the platform means off for every tenant regardless of
their preference; on at the platform still respects a tenant who has it off.

Audit for any other caller — the route in `documents.controller.ts`, the
`billing-sweep` CLI in `src/workers/`, and any scheduled job — and make sure
every path reaches the gate. A route that calls the repository directly is a
hole; if you find one, route it through the service.

## Task 3 — dunning and payouts

Find the equivalent entry points for retry escalation and any payout/settlement
sweep. If a given capability has no implementation yet, **add nothing** — record
in your report that the switch exists ahead of the feature and why, rather than
inventing a code path to gate. Do not build a feature in order to park it.

## Task 4 — the preference UI stays honest

Where Console or the Billing app lets an operator configure a late-fee policy,
that UI stays. It is legitimate to set a policy that will apply later. Add no
banner, no warning colour, and no explanatory paragraph — the root `CLAUDE.md`
UI-copy rule forbids the paragraph, and the switch is an operator concern, not a
tenant one.

If the platform switch is genuinely useful to surface to a 876 admin, the place
is Console, and only as a plain read-only row. Prefer doing nothing here and
saying so.

## Task 5 — deployment

Add the three variables to `apps/billing-api/wrangler.jsonc` `vars` with the
value `"false"`, and to `scripts/cloudflare-release-contract.mjs` **only** if
that file lists non-secret vars — do not add them to `requiredSecrets`, which
would fail deploy preflight for an unset optional switch.

Document all three in `docs/billing/README.md`'s parked table, naming the exact
variable beside each capability.

## Verification — foreground, real output

```
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:check
npx prettier --check <every file you touched>
```

`typecheck` fails on `packages/core/src/fetch/bridge.ts(154,50)` on `main`,
before this change — pre-existing, not yours, but run it and confirm no new
error appears.

Tests you must add:

- platform off + tenant on → no assessment, zero rows written, the neutral
  result returned;
- platform on + tenant off → unchanged existing behaviour;
- platform on + tenant on → unchanged existing behaviour, still creating the
  fee;
- the log line fires exactly once when the platform switch blocks a run.

## Constraints

- Do not commit.
- Do not delete, disable, or weaken `calculateLateFee`, the schema, the
  preference routes, or any existing test.
- Do not read `process.env` outside `src/config/`.
- Do not read settings from a repository.
- Do not touch `apps/console`, `apps/api`, `packages/*`, or the payment
  instrument modules.
