# Simple app client migration — 2026-08-30

## Scope and roots

- `apps/enterprise`: replaced the browser `src/lib/876/index.ts` and signed-in server `src/lib/876/server.ts` with `services/account.ts` (same-origin browser Account client), `services/account-server.ts` (request-scoped Account client), and `services/workspace.ts` (request-scoped Workspace Session client). The request-scoped roots use the signed-in access token, `API_876_KEY`, and the existing API URL; they do not use an internal key.
- `apps/876`: replaced the static server `$876` root with `services/account.ts`, a lazy module singleton because its API key is static and OpenNext imports route modules before runtime secrets exist. Browser auth, onboarding, and audit calls use `@876/account` against their existing same-origin routes. The existing internal-key bootstrap in `src/lib/auth/guards.ts` was not changed.
- `apps/billing`: replaced `src/lib/876/index.ts` with `services/billing.ts` (request-scoped tenant client, preserving `billing_active_org`, signed-in token, and request id), `services/widgets.ts` (lazy static-key singleton, with the member actor still passed per call), and request-scoped `services/account.ts` for the existing app list. `services/account-browser.ts` is a same-origin browser Account client. `services/platform.ts` is a relocation of the pre-existing Billing bootstrap helper, not a new authority tier.

## Files changed

- `apps/enterprise/package.json` — replaced `@876/client` with Account and Workspace dependencies.
- `apps/enterprise/next.config.ts` — transpiles Account and Workspace.
- `apps/enterprise/src/lib/services/account.ts` — added browser Account root.
- `apps/enterprise/src/lib/services/account-server.ts` — added request Account root.
- `apps/enterprise/src/lib/services/workspace.ts` — added request Workspace Session root.
- `apps/enterprise/src/lib/876/index.ts` — deleted obsolete browser facade.
- `apps/enterprise/src/lib/876/server.ts` — deleted obsolete signed-in facade.
- `apps/enterprise/src/lib/analytics/client.ts` — audit mirror now uses Account.
- `apps/enterprise/src/lib/auth/account-validity.ts` — current-user validity uses Account.
- `apps/enterprise/src/lib/auth/account-validity.test.ts` — mock now targets Account.
- `apps/enterprise/src/lib/auth/guards.ts` — account and membership/feature reads use bounded roots.
- `apps/enterprise/src/lib/auth/guards.test.ts` — mock now targets Workspace Session.
- `apps/enterprise/src/lib/auth/guards-advanced.test.ts` — mocks and expectations follow signed-in Account/Workspace Session calls.
- `apps/enterprise/src/components/shell/shell.tsx` — entitlement and membership reads use Workspace Session.
- `apps/enterprise/src/components/shell/shell.test.tsx` — mock now targets Workspace Session.
- `apps/enterprise/src/components/shell/user-menu.tsx` — logout uses browser Account root.
- `apps/enterprise/src/app/login/_components/embedded-auth.tsx` — auth UI uses browser Account root.
- `apps/enterprise/src/app/register/_components/business-onboarding.tsx` — auth UI uses browser Account root.
- `apps/enterprise/src/app/[slug]/apps/page.tsx` — uses Workspace Session.
- `apps/enterprise/src/app/[slug]/apps/[appSlug]/page.tsx` — uses Workspace Session.
- `apps/enterprise/src/app/[slug]/locations/page.tsx` — uses Workspace Session.
- `apps/enterprise/src/app/[slug]/locations/[locationId]/edit/page.tsx` — uses Workspace Session.
- `apps/enterprise/src/app/[slug]/members/page.tsx` — uses Workspace Session member projection.
- `apps/enterprise/src/app/[slug]/members/new/page.tsx` — uses Workspace Session.
- `apps/enterprise/src/app/[slug]/organization/page.tsx` — uses Workspace Session.
- `apps/enterprise/src/app/[slug]/organization/details/page.tsx` — uses Workspace Session.
- `apps/enterprise/src/app/[slug]/organization/edit/page.tsx` — uses Workspace Session.
- `apps/enterprise/src/app/[slug]/organization/contacts/page.tsx` — uses Workspace Session.
- `apps/enterprise/src/app/[slug]/organization/contacts/new/page.tsx` — uses Workspace Session member projection.
- `apps/enterprise/src/app/[slug]/organization/contacts/[contactId]/edit/page.tsx` — uses Workspace Session member projection.
- `apps/enterprise/src/app/api/orgs/[slug]/contacts/route.ts` — uses Workspace Session.
- `apps/enterprise/src/app/api/orgs/[slug]/contacts/[contactId]/route.ts` — uses Workspace Session.
- `apps/enterprise/src/app/api/orgs/[slug]/details/route.ts` — uses Workspace Session.
- `apps/enterprise/src/app/api/orgs/[slug]/invites/route.ts` — uses Workspace Session.
- `apps/enterprise/src/app/api/orgs/[slug]/invites/[inviteId]/route.ts` — uses Workspace Session.
- `apps/enterprise/src/app/api/orgs/[slug]/locations/route.ts` — uses Workspace Session.
- `apps/enterprise/src/app/api/orgs/[slug]/locations/[locationId]/route.ts` — uses Workspace Session.
- `apps/enterprise/src/app/api/orgs/[slug]/members/[membershipId]/route.ts` — uses Workspace Session member projection.
- `apps/876/package.json` — replaced `@876/client` with Account.
- `apps/876/next.config.ts` — transpiles Account.
- `apps/876/src/lib/services/account.ts` — added lazy static-key Account singleton.
- `apps/876/src/lib/876/index.ts` — deleted obsolete server facade.
- `apps/876/src/lib/auth/client.ts` — browser auth bridge uses Account.
- `apps/876/src/lib/analytics/client.ts` — audit mirror uses Account.
- `apps/876/src/app/onboarding/_components/onboarding-flow.tsx` — same-origin onboarding uses Account.
- `apps/876/src/app/app/linked-apps/page.tsx` — linked grants use Account.
- `apps/876/src/app/api/linked-apps/revoke/route.ts` — grant revocation uses Account.
- `apps/billing/package.json` — replaced `@876/client` with Account.
- `apps/billing/next.config.ts` — transpiles Account and Widgets.
- `apps/billing/src/lib/services/account.ts` — added request-scoped Account root.
- `apps/billing/src/lib/services/account-browser.ts` — added browser Account root.
- `apps/billing/src/lib/services/billing.ts` — added request-scoped tenant Billing root.
- `apps/billing/src/lib/services/widgets.ts` — added lazy static-key Widgets root.
- `apps/billing/src/lib/services/platform.ts` — relocated the existing Billing bootstrap helper.
- `apps/billing/src/lib/876/index.ts` — deleted obsolete composed facade.
- `apps/billing/src/lib/876/platform-client.ts` — deleted after relocation.
- `apps/billing/src/app/login/_components/embedded-auth.tsx` — same-origin auth uses Account.
- `apps/billing/src/app/(app)/(subscription-management)/(catalog)/products/new/page.tsx` — app list uses Account.
- `apps/billing/src/app/api/widgets/notepad/route.ts` — notes use Widgets root.
- `apps/billing/src/app/api/widgets/notepad/[id]/route.ts` — notes use Widgets root.
- `apps/billing/src/app/api/widgets/notepad/collections/route.ts` — collections use Widgets root.
- `apps/billing/src/app/api/widgets/notepad/collections/[id]/route.ts` — collections use Widgets root.
- `apps/billing/src/app/(app)/customers/[customerId]/_data.ts` — relocated platform-helper import.
- `apps/billing/src/app/(app)/settings/users/page.tsx` — relocated platform-helper import.
- `apps/billing/src/app/get-started/page.tsx` and `page.test.tsx` — relocated platform-helper import/mock.
- `apps/billing/src/app/api/activate/route.ts` and `route.test.ts` — relocated platform-helper import/mock.
- `apps/billing/src/app/api/auth/switch-org/route.ts` and `route.test.ts` — relocated platform-helper import/mock.
- `apps/billing/src/app/api/onboarding/organization/route.ts` and `route.test.ts` — relocated platform-helper import/mock.
- `apps/billing/src/app/api/team/invites/route.ts` and `[inviteId]/route.ts` — relocated platform-helper import.
- `apps/billing/src/lib/auth/account-validity.ts` — relocated platform-helper import.
- `apps/billing/src/lib/auth/billing-context.ts` and `billing-context.test.ts` — relocated platform-helper import/mock.
- `apps/billing/src/lib/features.ts` and `features.test.ts` — relocated platform-helper import/mock.
- `apps/billing/src/lib/provisioning/manifest.ts` and `manifest.test.ts` — relocated background platform-helper import/mock.

## Verification

Baseline: Enterprise was 18 files / 358 tests and remains 18 files / 358 tests. Consumer was 5 files / 30 tests and remains 5 files / 30 tests. Billing's baseline command did not complete: it emitted `Not implemented: navigation to another Document` and remained running before any edits; the post-change command has the same result, so a test count could not be measured.

`pnpm --filter @876/enterprise typecheck`

```text
$ tsc --noEmit
```

`pnpm --filter @876/enterprise test`

```text
Test Files  18 passed (18)
Tests  358 passed (358)
```

`pnpm --filter @876/app typecheck && pnpm --filter @876/app test`

```text
$ tsc --noEmit
Test Files  5 passed (5)
Tests  30 passed (30)
```

`pnpm --filter @876/billing-app typecheck`

```text
$ tsc --noEmit
```

`pnpm --filter @876/billing-app test`

```text
$ vitest run
RUN  v4.1.11 /root/projects/876/apps/billing
Not implemented: navigation to another Document
```

`npx prettier --check "apps/{enterprise,876,billing}/**/*.{ts,tsx}"`

```text
Checking formatting...
All matched files use Prettier code style!
```

`pnpm install --no-frozen-lockfile`

```text
Scope: all 37 workspace projects
Already up to date
Done in 615ms using pnpm v11.3.0
```

`grep -rn "@876/client\|lib/876" apps/enterprise/src apps/876/src apps/billing/src`

```text
apps/enterprise/src/app/api/onboarding/organization/route.test.ts:19:vi.mock('@/lib/876/platform-client', () => ({
apps/enterprise/src/app/api/onboarding/organization/route.ts:8:import { getPlatformClient } from '@/lib/876/platform-client'
```

## Blocker

Enterprise's authenticated organization-bootstrap route still calls `organizations.create({ ownerUserId, name })`. The current `@876/workspace/session` client does not expose an organization-bootstrap/create operation, while the old helper reaches that operation through the internal-key platform client. The brief explicitly prohibits Enterprise from acquiring an operator/internal credential and says to stop rather than grant one. I therefore left that one helper and its test in place; deleting it or changing it would either break onboarding or widen Enterprise authority. This is why the final grep is not clean and `apps/enterprise/src/lib/876/` cannot yet be deleted completely.

The dependency installation completed without changing the lockfile.
