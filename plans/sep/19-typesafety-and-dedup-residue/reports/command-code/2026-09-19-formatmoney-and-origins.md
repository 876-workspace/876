# Finish the `formatMoney` consolidation and remove the remaining hardcoded origins

Date: 2026-09-19
Branch: `refactor/typesafety-and-dedup-residue`
Scope: Part 1 — five `formatMoney` copies onto `@876/core/money`; Part 2 — the
`876.app` origin fallbacks named by the brief's grep.

Both parts follow "delete the copy, call the owner". No commit, branch, or PR
was created. `apps/billing/src/lib/service/` was not touched, and `plans/`,
`.claude/rules/`, `.agents/rules/` were not edited (this report is the only
file written under `plans/`).

### Files changed (27, plus this report)

- Part 1 owners/consumers: `apps/console/src/features/billing/price-options.ts`,
  `apps/console/src/app/(app)/orgs/[slug]/billing/_components/accounts-manager.tsx`,
  `apps/invoice/src/lib/format.ts`,
  `apps/couriers/src/lib/finance/format.ts`,
  `packages/projects-ui/src/finance/format-money.ts` (+ test),
  `packages/projects-ui/src/finance/{financial-summary-panel,rate-list}.tsx`,
  `packages/projects-ui/src/reports/budget-variance-table.tsx`,
  component tests in `packages/projects-ui/src/{finance,reports}/` (5 files,
  USD rendering expectations), `packages/projects-ui/package.json`,
  `packages/projects-ui/tsconfig.json`, `pnpm-lock.yaml`.
- Part 2: `apps/console/src/components/shell/topbar-actions.tsx` (+ test),
  `apps/invoice/src/components/shell/topbar-actions.tsx`,
  `apps/billing/src/components/shell/topbar-actions.tsx`,
  `apps/couriers/src/lib/portal/tenant.ts` (+ test), and the four
  `.env.example` files for console, invoice, billing, couriers.

---

## Part 1 — one `formatMoney`: `@876/core/money`

Owner read first: `packages/core/src/lib/money/currency.ts` (exported from
`@876/core/money` via `packages/core/src/lib/money/index.ts`). It renders
`en-JM`, takes minor-unit digits from `Intl` per currency, returns `—` for a
null amount, returns the raw minor-unit string when the currency is falsy, and
shows a value it cannot represent exactly verbatim (`USD 12.34`) rather than
rounding it.

No parameter was added to the owner. Two differences were genuine enough to
keep, and both are handled outside the owner (details below): Console's
null-currency → USD default, and Projects' "Unpriced" sentinel.

### Per-copy decisions

| File | Verdict | Route |
| --- | --- | --- |
| `apps/console/src/features/billing/price-options.ts:26` | differs (locale, hardcoded 2 digits, null-currency default) | deleted; call the owner; the USD default kept at the one nullable call site |
| `apps/invoice/src/lib/format.ts:1` | matches rendering; two edge-path differences | deleted; re-export `@876/core/money` |
| `apps/couriers/src/lib/finance/format.ts:6` | matches rendering (one cosmetic difference) | deleted; re-export `@876/core/money` |
| `packages/projects-ui/src/finance/format-money.ts:70` (`formatMoney`) | genuinely different implementation | deleted; re-export the owner; call sites updated |
| `packages/projects-ui/src/finance/format-money.ts:88` (`formatMoneyOrUnpriced`) | sentinel wrapper, not a formatter | kept as a named wrapper around the owner |

#### 1. `apps/console/src/features/billing/price-options.ts`

What differed from the owner:

- `en-US` locale instead of `en-JM` (USD → `$12.34` vs `US$12.34`; JMD → `JMD 12.34` vs `$12.34`).
- `(amount ?? 0) / 100` — a hardcoded two-decimal assumption instead of `Intl`'s minor-unit digits.
- `currency ?? 'usd'` — a missing currency rendered as USD, where the owner returns the raw minor-unit string.
- `amount ?? 0` was dead (the parameter was `number`).

Route: **delete, call the owner.** `formatPriceLabel` now calls
`formatMoney` from `@/lib/format` (the app-local owner re-export), and so does
its only other consumer, `accounts-manager.tsx`.

The null-currency default was a real product decision, so it was preserved
where it can actually occur: `AdminPrice.currency` is `string` (non-nullable),
while `AdminBillingAccount.currency` is `string | null`. The three balance
renderings in `accounts-manager.tsx` (grid, list, table) now pass
`account.currency ?? 'usd'` — the previous behaviour, expressed at the call
site rather than inside a second formatter. No new wrapper function and no new
test surface.

#### 2. `apps/invoice/src/lib/format.ts`

Rendering matched the owner (same `en-JM`, same `Intl` digits, same `—` for a
null amount). Two edge paths differed:

- a non-safe-integer amount rendered as `` `${currency} ${amount}` `` without
  uppercasing the code; the owner uppercases it.
- a `try/catch` around `Intl.NumberFormat` fell back to
  `` `${currency} ${Number(amount) / 100}` `` for an invalid currency code —
  converting a malformed-data error into a plausible-looking string.

Route: **delete, re-export.** `@/lib/format` is imported by 25 files and also
owns `formatDate`/`unixTimestampToDateInput`, so it now begins with
`export { formatMoney } from '@876/core/money'` — the same pattern
`apps/console/src/lib/format.ts` already uses. No importer changed.

Behaviour changes, stated explicitly: an invalid currency code now throws from
`Intl` instead of rendering a fallback (deliberate removal of an
error-swallowing path, per `.agents/rules/ai-code-quality.md` defensive-code
rules), and the verbatim fallback now uppercases the currency code.

#### 3. `apps/couriers/src/lib/finance/format.ts`

`en-JM`, `Intl` digits, `—` for null, verbatim for non-safe-integers — the
rendering matched the owner. The only difference was that the verbatim path
did not uppercase the currency code (owner: `USD 12.505`, copy: `usd 12.505`).

Route: **delete, re-export.** The four existing `formatMoney` cases in
`apps/couriers/src/lib/finance/format.test.ts` pass unchanged against the
owner; `formatDate` stays local.

#### 4/5. `packages/projects-ui/src/finance/format-money.ts`

This was the genuine case, and it was doing two different jobs.

- `formatMoney(minor, currency, locale?)` was a second implementation: string
  maths, a `locale` parameter, a `formatToParts` symbol lookup, and a
  `string | null` return that made a non-integer amount unrenderable. It was
  deleted; the module now re-exports the owner, and the three internal call
  sites (`financial-summary-panel.tsx`, `rate-list.tsx`,
  `budget-variance-table.tsx`) call it directly.
- `currencyFractionDigits` was only used by that implementation and duplicated
  the owner's `currencyMinorUnitDigits`; deleted.
- `formatMoneyOrUnpriced` is the sentinel, not a formatter: it stays as a
  wrapper that renders `UNPRICED_LABEL` for `null`/`undefined` and delegates
  everything else (including `0`) to the owner.

Call-site cleanups that follow from the owner's `string` return:
`formatMoney(...) ?? '—'` in `financial-summary-panel.tsx` and `rate-list.tsx`
(four occurrences) was dead and was removed; `budget-variance-table.tsx` keeps
its explicit `minor === null || currency === null → —` guard, so an unknown
currency still renders a dash rather than a raw amount.

Behaviour changes, stated explicitly:

- Output is now the platform `en-JM` rendering, not the viewer/runtime locale
  (previously `new Intl.NumberFormat(undefined, …)` — nondeterministic across
  machines). Tests that pinned `$1,000.00` for USD now pin `US$1,000.00`
  (`billing-config-summary`, `budget-list`, `financial-summary-panel`,
  `rate-list`, `budget-variance-table` component tests were updated).
- A malformed amount (`'12.34'`, `'abc'`) now renders verbatim (`USD 12.34`)
  instead of `null`/`Unpriced`; exact integer amounts render identically.
- The `locale` parameter is gone and the return is `string`, not
  `string | null`.

### Public signature changes (explicit, per the brief)

| Symbol | Before | After |
| --- | --- | --- |
| `@876/projects-ui/finance/format-money` `formatMoney` | `(number \| string, string, locale?) => string \| null` | owner's `(string \| number \| bigint \| null \| undefined, string \| null \| undefined) => string` |
| … `formatMoneyOrUnpriced` | `(number \| string \| null \| undefined, string, locale?) => string` | `(string \| number \| bigint \| null \| undefined, string) => string` (locale dropped, minor widened) |
| … `currencyFractionDigits` | exported | removed (unused; owner has `currencyMinorUnitDigits`) |
| `apps/console/src/features/billing/price-options.ts` `formatMoney` | exported `(number, string \| null) => string` | removed (no external consumer beyond `accounts-manager.tsx`) |
| `apps/invoice/src/lib/format.ts`, `apps/couriers/src/lib/finance/format.ts` `formatMoney` | narrower input types | widened to the owner's; no call site needed a change |

`@876/core/money` itself is unchanged.

### Wrapper tests (counted `it()` cases)

| Wrapper kept | File | `it()` cases |
| --- | --- | --- |
| `formatMoneyOrUnpriced` | `packages/projects-ui/src/finance/format-money.test.ts` | **6** |

Cases: null → `Unpriced`; undefined → `Unpriced`; zero → `$0.00` (JMD); number
and string minor units through the owner; negative sign outside the symbol;
USD in the platform locale (`US$12.34`). The same file keeps 2
`formatMinutes` and 1 `formatDay` case — 9 `it()` in the file, all passing.
The 7 duplicate `formatMoney` cases and 2 `currencyFractionDigits` cases were
deleted with the implementations; the owner's own
`packages/core/src/lib/money/currency.test.ts` already pins that behaviour.

### Other changes required for Part 1

- `packages/projects-ui/package.json`: added `"@876/core": "workspace:*"`
  (only dependency added; the brief allows this one). `pnpm-lock.yaml` gained
  the matching importer entry (`pnpm install --offline --no-frozen-lockfile`).
- `packages/projects-ui/tsconfig.json`: `target` `ES2017` → `ES2020`. Without
  it, `tsc` fails on `@876/core`'s BigInt literals (17 × TS2737) once the
  package imports core; every other core consumer already targets ES2020+. The
  package still only depends on `@876/core`, `@876/projects`, `@876/ui`.

---

## Part 2 — no hardcoded service origins

`.agents/rules/env-configuration.md` rule 4 read first. The brief's grep
returns 38 lines (not 36) across the 10 files in its table; the extra two are
in `apps/couriers/src/lib/portal/tenant.test.ts`, which the header counts once
and which carries three origin literals.

### Per-site decisions

| Site | Decision |
| --- | --- |
| `apps/console/src/components/shell/topbar-actions.tsx` (4 fallbacks) | **removed → omit** |
| `apps/invoice/src/components/shell/topbar-actions.tsx` (4 fallbacks) | **removed → omit** |
| `apps/billing/src/components/shell/topbar-actions.tsx` (1 fallback + 1 hardcoded URL) | **removed → omit** |
| `apps/couriers/src/lib/portal/tenant.ts` (`DEFAULT_PORTAL_BASE_DOMAIN`) | **removed → omit** |
| `apps/console/src/components/shell/topbar-actions.test.tsx:181` | intentionally kept (asserts `876.app` is absent) |
| `apps/console/src/app/(app)/settings/general/page.tsx:28` | intentionally kept (support email address, not an origin) |
| `apps/api/src/seeds/bootstrap.ts:34–82` (8) | intentionally kept (seed fixture data mirroring `core/platform_apps.py`) |
| `packages/core/src/lib/apps-directory.test.ts:95` | intentionally kept (assertion that no fallback is substituted) |
| `packages/core/src/request-context/index.test.ts:173,182,301` (3) | intentionally kept (test fixture origins) |

#### App switchers (console, invoice, billing) — omitted

All three are inline `AppSwitcherApp[]` lists in client components. Each entry
that read `process.env.NEXT_PUBLIC_* ?? 'https://….876.app'` now reads the
variable only, and an unset variable drops the entry:

```ts
function appEntry(name: string, url: string | undefined): AppSwitcherApp[] {
  return url ? [{ name, url }] : []
}
```

Omit was chosen because this is an app-switcher entry: the repo's
`@876/core/apps-directory` owner already defines exactly this policy
("an app whose variable is unset is omitted… no fallback origin"), and a
missing link is strictly better than a link to a guessed production host.

Variable changes made while removing the fallbacks:

- Console's consumer entry now reads `NEXT_PUBLIC_CONSUMER_URL` (declared and
  written by `scripts/setup-dev-env.mjs`) instead of the undeclared
  `NEXT_PUBLIC_876_APP_URL`. Invoice's reads `NEXT_PUBLIC_APP_URL` (declared,
  dev-wired, and the name `@876/core/apps-directory` uses for the consumer app)
  instead of `NEXT_PUBLIC_876_APP_URL` as well. **`NEXT_PUBLIC_876_APP_URL` is
  no longer read anywhere in the repo.** Both swaps mean the 876 entry now
  follows the configured consumer origin instead of `https://876.app` in local
  dev.
- Billing's hardcoded `{ name: '876', url: 'https://876.app' }` (the only one of
  the ten with no variable at all) now reads `NEXT_PUBLIC_APP_URL`, which
  `apps/billing/.env.example` already declared.
- Console's switcher test was rewritten: the "complete fallback directory" test
  became "configured app directory" (all four variables stubbed), and a new
  test stubs two of four and asserts the other two are absent and that no
  rendered href contains `876.app`. That file went from 11 hits to 1 (the
  negative assertion).

Duplication note: the one-line `appEntry` idiom now exists in three apps. It
was a deliberate trade — `buildAppsDirectory` has a fixed nine-app catalog and
canonical names (`876 Billing`, `876 Console`, …), so wiring these three
switchers to it would change the visible entries and names, which this brief
did not ask for. Migrating them is the natural follow-up (see Unverified).

#### Couriers portal base domain — omitted, not failed loudly

`getPortalTenant()` resolved `<slug>.<PORTAL_BASE_DOMAIN>` and defaulted the
domain to the literal `couriers.876.app` when the variable was unset or blank.
`PORTAL_BASE_DOMAIN` is now load-bearing: unset/blank skips only the
base-domain branch (verified custom hostnames and the non-production
`PORTAL_DEV_TENANT_SLUG` still resolve) and returns `null` from that path.

Omit rather than fail loudly because `getPortalTenant()` runs for every portal
request: throwing on an env gap would take down custom-domain portals that do
not depend on the base domain at all. The `.env.example` entry states the
consequence, and the base domain is now a value an operator must configure
rather than one the code guesses.

Tests updated in place: the two base-domain cases stub
`PORTAL_BASE_DOMAIN=couriers.example.test` with `couriers.example.test`
hostnames (the `876.app` fixtures are gone from that file), and a new case
stubs the variable blank and asserts the resolver is called exactly once, with
the hostname only. `apps/couriers/src/lib/portal/tenant.test.ts`: 7 `it()`.

### Env declarations added

All are marked `# optional — …` because an unset value omits rather than
defaults; `scripts/check-env-parity.mjs` reads the marker from the key's own
line.

| App | Declared |
| --- | --- |
| `apps/console/.env.example` | `NEXT_PUBLIC_BILLING_URL`, `NEXT_PUBLIC_ENTERPRISE_URL`, `NEXT_PUBLIC_COURIERS_URL` added; `NEXT_PUBLIC_CONSUMER_URL` re-commented (it is now the switcher origin) and marked optional |
| `apps/invoice/.env.example` | `NEXT_PUBLIC_BILLING_URL`, `NEXT_PUBLIC_CONSOLE_URL`, `NEXT_PUBLIC_COURIERS_URL` |
| `apps/billing/.env.example` | `NEXT_PUBLIC_COURIERS_URL` |
| `apps/couriers/.env.example` | `PORTAL_BASE_DOMAIN` |

Values follow the file's existing convention (localhost dev ports from
`scripts/setup-dev-env.mjs`; `PORTAL_BASE_DOMAIN` documented with the deployed
`couriers.876.app` value). No code fallback was added anywhere.

### Out-of-grep findings (not changed, for the record)

The brief's grep cannot see these; a broader `876\.app` search finds:

- `apps/billing/src/app/no-access/_components/no-access-actions.tsx:39` —
  `NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'`, a rule-4 fallback of the
  same class but not a `876.app` literal.
- `apps/couriers/src/app/manage/(private)/page.tsx:32` — displays
  `{tenant.slug}.couriers.876.app` as help text.
- `apps/couriers-api/src/modules/tenants/tenants.repository.ts:69` — seeds
  `${options.slug}.couriers.876.app` as a tenant's default hostname (template
  literal, no quote).
- `apps/couriers/src/app/portal/auth/complete/route.test.ts:44` — a test
  fixture URL.
- Gitignored `apps/*/.next/**` build caches still embed the pre-change sources
  from `apps/invoice/src/lib/format.ts` and
  `packages/projects-ui/src/finance/format-money.ts`; they regenerate on the
  next dev/build and are why the raw acceptance grep is noisy (below).

### `pnpm check:env`

`pnpm check:env console invoice billing couriers` reports every new variable as
`unset but optional` and nothing new as required. The `missing locally` lists
for each app (e.g. console's `CONSOLE_IDENTITY_URL`, `STORAGE_API_URL`;
billing's `NEXT_PUBLIC_APP_URL`) are pre-existing local-env gaps, unchanged by
this work and present for keys this change does not read.

---

## Verification

Run one command at a time. `NODE_ENV` is `production` in this shell, which
makes React's `act` unavailable and fails every jsdom component test in the
repo (reproduced in untouched `@876/ui`); test runs below prefix
`NODE_ENV=test`.

| Command | Result |
| --- | --- |
| `pnpm --filter @876/core test` | **pass** — 52 files, 1354 tests |
| `pnpm --filter @876/core typecheck` | **pass** |
| `pnpm --filter @876/console typecheck` | **pass** |
| `pnpm --filter @876/invoice-app typecheck` | **pass** |
| `pnpm --filter @876/couriers-app typecheck` | **pass** |
| `pnpm --filter @876/projects typecheck` | **pass** (resolves to `packages/projects`) |
| `pnpm --filter @876/projects-app typecheck` | **pass** (the app that consumes `@876/projects-ui`) |
| `pnpm --filter @876/projects-ui typecheck` | **pass** (after the ES2020 target bump; before it, 17 × TS2737 from core's BigInt literals) |
| `NODE_ENV=test pnpm --filter @876/projects-ui test` | **pass** — 68 files, 749 tests |
| `NODE_ENV=test pnpm --filter @876/console exec vitest run src/components/shell/topbar-actions.test.tsx` | **pass** — 6 tests |
| `NODE_ENV=test pnpm --filter @876/couriers-app exec vitest run src/lib/portal/tenant.test.ts src/app/[orgSlug]/invoices/[id]/_lib/invoice-document.test.ts` | **pass** — 18 tests |
| `NODE_ENV=test pnpm --filter @876/couriers-app exec vitest run src/lib/finance/format.test.ts` | **pass** — 6 tests (unchanged expectations) |
| `NODE_ENV=test pnpm --filter @876/invoice-app exec vitest run` (payments-list, sales-receipts-list, invoices-list, items-list) | **pass** — 19 tests |
| eslint, changed files (console, invoice, billing, couriers configs) | **clean**, exit 0 |
| prettier, changed files | clean for everything rewritten; `financial-summary-panel.tsx`, `rate-list.tsx` and three projects-ui test files have **pre-existing** debt (verified dirty at `HEAD`) and were left alone rather than adding unrelated diff noise |
| `pnpm check:env console invoice billing couriers` | new variables `unset but optional`; only pre-existing required-key gaps otherwise |

`format-money.ts` rewritten from scratch and its test file are prettier-clean.

### Final greps

```
$ grep -rn "export function formatMoney" apps packages | grep -v node_modules
```

Raw output includes 13 lines from gitignored `apps/*/.next/**` sourcemaps
(stale pre-change sources) plus the two source lines below. Source only:

```
packages/projects-ui/src/finance/format-money.ts:18:export function formatMoneyOrUnpriced(
packages/core/src/lib/money/currency.ts:41:export function formatMoney(
```

The second line is the owner; the first is the allowed `formatMoneyOrUnpriced`
wrapper (the brief's grep matches it as a prefix). Adding the `(`:

```
$ grep -rn "export function formatMoney(" apps packages --exclude-dir=.next | grep -v node_modules
packages/core/src/lib/money/currency.ts:41:export function formatMoney(
```

**Exactly one** `formatMoney` definition, at the owner.

```
$ grep -rn "876\.app'" apps packages --include='*.ts' --include='*.tsx' | grep -v node_modules | wc -l
14
```

Down from 38. The 14 are the intentionally kept hits listed above: 1 console
test assertion, 1 console support address, 8 `apps/api` seed `homepageUrl`
values, 1 core test assertion, 3 core request-context fixtures. No fallback
origin remains in any of the ten files the brief named.

---

## Unverified / follow-ups

1. **Full app suites not run.** Console, invoice and billing have large jsdom
   suites; only the files touched by this change (plus their money-rendering
   neighbours) were run, under `NODE_ENV=test`. `pnpm test` at the root would
   fail repo-wide on the `NODE_ENV=production`/`React.act` interaction
   described above, in files this change does not touch.
2. **No browser render check** of any switcher or finance panel.
3. **Dev-env parity.** `scripts/setup-dev-env.mjs` writes only a subset of the
   switcher origins (console gets `CONSUMER_URL`/`BILLING_URL`; invoice gets
   `APP_URL`; billing gets neither `COURIERS_URL` nor `APP_URL`), so locally the
   switchers now omit those apps rather than pointing at production. That is
   the intended trade of omission over a guessed origin; adding the origins to
   `envPlanFor` is the place to restore dev parity if wanted.
4. **Three inline switchers remain inline.** Console, invoice and billing still
   build their own `AppSwitcherApp[]` and now carry three copies of the
   one-line `appEntry` omit idiom. Migrating them to
   `@876/core/apps-directory` would delete the idiom and settle the
   `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_CONSUMER_URL` naming, but changes the
   displayed names (`Billing` → `876 Billing`, plus CRM/Projects/Invoice/
   Commerce entries when configured), so it was left as a follow-up.
5. **Out-of-grep origin residue** listed in Part 2 (billing's `localhost`
   fallback, the couriers manage-page help text, the couriers-api default
   hostname, the portal auth test fixture) was found by a broader search and
   intentionally not changed — none are in the brief's grep.
6. **Stale `.next` caches** make the raw acceptance grep noisy until the next
   dev/build regenerates them; no cache directory was deleted.
7. **Parallel-track working tree.** This checkout also contains another
   track's uncommitted changes (eslint configs, `scripts/check-any-budget*`,
   `apps/console/src/lib/permissions.ts`, root `package.json` script). They
   were not touched; `pnpm install --offline --no-frozen-lockfile` added only
   the one `pnpm-lock.yaml` entry described above.
