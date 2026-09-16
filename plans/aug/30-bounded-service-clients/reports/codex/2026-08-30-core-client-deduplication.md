# Core client deduplication

## Outcome

`@876/account` and `@876/platform` are now the only homes of the Core client implementation. The former `@876/sdk` and `@876/admin` packages remain available as thin compatibility packages so every existing import continues to compile without application changes.

- Moved the historical `@876/sdk` root to `@876/account/compat` with `git mv`; `@876/sdk` now has one-line root, `./client`, `./oauth`, and `./errors` re-exports.
- Moved the historical `@876/admin` root to `@876/platform/compat` with `git mv`; `@876/admin` now has a one-line root re-export.
- The rest of each implementation was already present at its identical bounded-package destination when this pass began, so those redundant legacy copies were deleted rather than moved over existing tracked paths.
- Removed now-unneeded implementation dependencies from the two compatibility package manifests, added their bounded-package dependency, and refreshed the lockfile with `pnpm install --no-frozen-lockfile`.
- Updated the stale `@876/admin` / `@876/client/server` prose in `packages/platform/src/client.ts`; the historical `create876AdminClient` symbol is deliberately unchanged.
- `@876/workspace/session` resolves through `@876/account/internal`, and `@876/workspace/operator` through `@876/platform/internal`. The workspace package and Console typechecks validate both paths.

## Compatibility entrypoints

Added:

- `@876/account/client` — the legacy client module for `@876/sdk/client`.
- `@876/account/compat` — exact historical `@876/sdk` root surface.
- `@876/platform/compat` — exact historical `@876/admin` root surface.

Existing `@876/account/oauth` and `@876/account/errors` back the matching SDK subpaths. No legacy Admin subpaths existed.

## Root surfaces deliberately kept out of the bounded roots

The compatibility entrypoints preserve the historical roots exactly. The following is the TypeScript module-export comparison of each compatibility entrypoint to its bounded root, run on this worktree:

```text
--- account: compat=192, root=143, dropped=52 ---
DeletedEmployeeProfile
DeletedOrgDepartment
DeletedOrgLocation
DeletedOrgMember
EmployeeProfile
EmployeeProfileCreateParams
EmployeeProfileList
EmployeeProfileUpdateParams
Feature
FeatureList
FeatureListResult
InviteToken
InviteTokenCreateParams
InviteTokenList
OrgContact
OrgContactCreateParams
OrgContactList
OrgContactUpdateParams
OrgDepartment
OrgDepartmentCreateParams
OrgDepartmentList
OrgDepartmentUpdateParams
OrgLocation
OrgLocationCreateParams
OrgLocationList
OrgLocationUpdateParams
OrgMember
OrgMemberList
OrgMemberMe
OrgMemberRoleUpdateParams
OrgRole
OrgRoleCreateParams
OrgRoleList
OrgRoleUpdateParams
Organization
OrganizationSelfUpdateParams
PermissionCatalog
Price
Product
ProductList
ProductListResult
ProductResult
RoutingMembership
RoutingMembershipList
RoutingMembershipListResult
RoutingOrganization
SDK876AuthClient
SDK876Client
Subscription
SubscriptionItem
SubscriptionList
create876Client
--- platform: compat=180, root=12, dropped=171 ---
Admin876Client
Admin876ClientOptions
AdminAccount
AdminAddress
AdminAddressCreateParams
AdminAddressUpdateParams
AdminApiKey
AdminApiKeyCreateParams
AdminApiKeyCreated
AdminApiKeyUpdateParams
AdminApp
AdminAppAssignment
AdminAppAssignmentCreateParams
AdminAppCreateParams
AdminAppCreated
AdminAppKind
AdminAppPublic
AdminAppStatus
AdminAppUpdateParams
AdminApplicationModule
AdminApplicationModuleCreateParams
AdminApplicationModuleUpdateParams
AdminAuditEvent
AdminAuditEventCreateParams
AdminAuthAttempt
AdminAuthAttemptSummary
AdminBillingAccount
AdminBillingAccountCreateParams
AdminBillingAccountUpdateParams
AdminCommunicationCall
AdminCommunicationCallCreateParams
AdminCommunicationListParams
AdminCommunicationMessage
AdminCommunicationMessageCreateParams
AdminConsumerContact
AdminConsumerContactCreateParams
AdminConsumerContactUpdateParams
AdminConsumerProfile
AdminConsumerProfileUpdateParams
AdminDeletedAddress
AdminDeletedApiKey
AdminDeletedApp
AdminDeletedApplicationModule
AdminDeletedBillingAccount
AdminDeletedConsumerContact
AdminDeletedConsumerProfile
AdminDeletedEmployeeProfile
AdminDeletedFeature
AdminDeletedMembership
AdminDeletedOrgContact
AdminDeletedOrgDepartment
AdminDeletedOrgFeature
AdminDeletedOrgLocation
AdminDeletedOrgMember
AdminDeletedOrganization
AdminDeletedProduct
AdminDeletedProvisioningNote
AdminDeletedSession
AdminDeletedSubscription
AdminDeletedSubscriptionItem
AdminDeletedUser
AdminDeletedUserFeature
AdminDeletedUserPin
AdminDeletedUserSessions
AdminDevice
AdminEmployeeProfile
AdminEmployeeProfileCreateParams
AdminEmployeeProfileUpdateParams
AdminFeature
AdminFeatureCreateParams
AdminFeatureEvaluateParams
AdminFeatureGrants
AdminFeatureSearchParams
AdminFeatureUpdateParams
AdminInviteCreateParams
AdminInviteToken
AdminJsonValue
AdminListResponse
AdminMembership
AdminMembershipCreateParams
AdminMembershipUpdateParams
AdminOAuthGrant
AdminOnboardingAnswersReplaceParams
AdminOnboardingCatalog
AdminOnboardingField
AdminOnboardingFieldType
AdminOnboardingOption
AdminOnboardingSection
AdminOnboardingSession
AdminOnboardingTargetType
AdminOnboardingValidation
AdminOnboardingValidationIssue
AdminOrgContact
AdminOrgContactCreateParams
AdminOrgContactUpdateParams
AdminOrgDepartment
AdminOrgDepartmentCreateParams
AdminOrgDepartmentUpdateParams
AdminOrgFeature
AdminOrgFeatureGrantItem
AdminOrgFeatureGrantParams
AdminOrgFeatureUpdateParams
AdminOrgLocation
AdminOrgLocationCreateParams
AdminOrgLocationUpdateParams
AdminOrgMember
AdminOrgRole
AdminOrgRoleCreateParams
AdminOrgRoleUpdateParams
AdminOrgSetupParams
AdminOrganization
AdminOrganizationCreateParams
AdminOrganizationUpdateParams
AdminPhoneLookup
AdminPhoneLookupCreateParams
AdminPlatformClientOptions
AdminPrice
AdminPriceCreateParams
AdminPriceUpdateParams
AdminProduct
AdminProductCreateParams
AdminProductModulesReplaceParams
AdminProductUpdateParams
AdminProvisioningCatalog
AdminProvisioningDraftReplaceParams
AdminProvisioningManifest
AdminProvisioningManifestRevision
AdminProvisioningNote
AdminProvisioningProperty
AdminProvisioningReconciliationResult
AdminProvisioningResource
AdminProvisioningRun
AdminProvisioningRunStatus
AdminProvisioningSetup
AdminProvisioningSetupCreateParams
AdminProvisioningSetupStatus
AdminProvisioningSetupUpdateParams
AdminProvisioningStep
AdminProvisioningTargetType
AdminProvisioningValidation
AdminProvisioningValueType
AdminResult
AdminRoutingMembership
AdminSearchResponse
AdminSession
AdminSubscription
AdminSubscriptionBatch
AdminSubscriptionCreateParams
AdminSubscriptionItem
AdminSubscriptionItemCreateParams
AdminSubscriptionItemUpdateParams
AdminSubscriptionStatus
AdminSubscriptionUpdateParams
AdminUser
AdminUserApp
AdminUserCreateParams
AdminUserFeature
AdminUserFeatureGrantItem
AdminUserFeatureGrantParams
AdminUserFeatureUpdateParams
AdminUserIdentification
AdminUserPin
AdminUserPinVerification
AdminUserUpdateParams
AdminUsernameAvailability
DeletedReservedUsername
ReservedUsername
ReservedUsernameCreateParams
SessionRevoke
UnlinkedAccount
create876AdminClient
```

The account root in this worktree already exports the `App`, `AuditEvent`, and `OAuthGrant` types, so they are not among its actual 52 dropped exports. The compatibility entrypoint still carries the complete historical SDK surface, including all legacy resource types and `create876Client`.

## Source-line reduction

- `packages/sdk/src`: 8,193 lines at `HEAD` → 4 lines (four one-line shims).
- `packages/admin/src`: 7,798 lines at `HEAD` → 1 line (one root shim).

The requested tracked-source proof:

```text
packages/admin/src/index.ts:1
packages/sdk/src/client.ts:1
packages/sdk/src/errors.ts:1
packages/sdk/src/index.ts:1
packages/sdk/src/oauth.ts:1
--- source files ---
packages/admin/src/index.ts
packages/sdk/src/client.ts
packages/sdk/src/errors.ts
packages/sdk/src/index.ts
packages/sdk/src/oauth.ts
--- status scoped ---
 M packages/account/package.json
 M packages/account/src/client.test.ts
R  packages/sdk/src/index.ts -> packages/account/src/compat.ts
 M packages/account/src/index.ts
 M packages/account/src/resources.test.ts
 M packages/admin/package.json
 D packages/admin/src/client.ts
 D packages/admin/src/helpers.ts
 A packages/admin/src/index.ts
 D packages/admin/src/lookup.test.ts
 D packages/admin/src/lookup.ts
 D packages/admin/src/request.ts
 D packages/admin/src/resources/addresses.ts
 D packages/admin/src/resources/api-keys.ts
 D packages/admin/src/resources/app-access.ts
 D packages/admin/src/resources/apps.test.ts
 D packages/admin/src/resources/apps.ts
 D packages/admin/src/resources/audit-events.ts
 D packages/admin/src/resources/auth-attempts.test.ts
 D packages/admin/src/resources/auth-attempts.ts
 D packages/admin/src/resources/auth.test.ts
 D packages/admin/src/resources/auth.ts
 D packages/admin/src/resources/billing-accounts.ts
 D packages/admin/src/resources/communications.ts
 D packages/admin/src/resources/devices.test.ts
 D packages/admin/src/resources/devices.ts
 D packages/admin/src/resources/features.ts
 D packages/admin/src/resources/memberships.ts
 D packages/admin/src/resources/modules.test.ts
 D packages/admin/src/resources/modules.ts
 D packages/admin/src/resources/onboarding.test.ts
 D packages/admin/src/resources/onboarding.ts
 D packages/admin/src/resources/orgs.ts
 D packages/admin/src/resources/prices.ts
 D packages/admin/src/resources/products.ts
 D packages/admin/src/resources/provisioning.ts
 D packages/admin/src/resources/reserved-usernames.ts
 D packages/admin/src/resources/sessions.test.ts
 D packages/admin/src/resources/sessions.ts
 D packages/admin/src/resources/subscriptions.ts
 D packages/admin/src/resources/users.test.ts
 D packages/admin/src/resources/users.ts
 D packages/admin/src/runtime.ts
 D packages/admin/src/test/server-only-stub.ts
 D packages/admin/src/types.ts
 M packages/platform/package.json
 M packages/platform/src/client.ts
R  packages/admin/src/index.ts -> packages/platform/src/compat.ts
 M packages/platform/src/index.ts
 M packages/platform/src/internal.ts
 M packages/platform/src/operator.ts
 M packages/sdk/package.json
 D packages/sdk/src/client.test.ts
 M packages/sdk/src/client.ts
 D packages/sdk/src/errors.test.ts
 M packages/sdk/src/errors.ts
 D packages/sdk/src/errors/auth.ts
 D packages/sdk/src/errors/oauth.ts
 D packages/sdk/src/errors/types.ts
 D packages/sdk/src/helpers/index.ts
 D packages/sdk/src/helpers/is-default.ts
 D packages/sdk/src/helpers/is-expired.ts
 A packages/sdk/src/index.ts
 D packages/sdk/src/oauth.test.ts
 M packages/sdk/src/oauth.ts
 D packages/sdk/src/request.ts
 D packages/sdk/src/resources.test.ts
 D packages/sdk/src/resources/app-memberships.ts
 D packages/sdk/src/resources/apps.ts
 D packages/sdk/src/resources/audit-events.ts
 D packages/sdk/src/resources/auth.ts
 D packages/sdk/src/resources/features.ts
 D packages/sdk/src/resources/mobile-number-verifications.ts
 D packages/sdk/src/resources/mobile-numbers.ts
 D packages/sdk/src/resources/oauth-grants.ts
 D packages/sdk/src/resources/orgs.ts
 D packages/sdk/src/resources/products.ts
 D packages/sdk/src/resources/users.ts
 D packages/sdk/src/types/api.ts
 D packages/sdk/src/types/app-memberships.ts
 D packages/sdk/src/types/apps.ts
 D packages/sdk/src/types/audit-events.ts
 D packages/sdk/src/types/auth.ts
 D packages/sdk/src/types/features.ts
 D packages/sdk/src/types/mobile-numbers.ts
 D packages/sdk/src/types/oauth-grants.ts
 D packages/sdk/src/types/oauth.ts
 D packages/sdk/src/types/orgs.test.ts
 D packages/sdk/src/types/orgs.ts
 D packages/sdk/src/types/products.ts
 D packages/sdk/src/types/users.test.ts
 D packages/sdk/src/types/users.ts
 D packages/sdk/src/validation.ts
 M packages/workspace/src/index.ts
 M packages/workspace/src/operator.ts
 M packages/workspace/src/session.ts
 M packages/workspace/tsconfig.json
 M pnpm-lock.yaml
```

## Duplication proof

```text
--- sdk/account diff ---
Only in packages/account/src: account.ts
Only in packages/account/src: client.test.ts
Files packages/sdk/src/client.ts and packages/account/src/client.ts differ
Only in packages/account/src: compat.ts
Only in packages/account/src/errors: auth.ts
Only in packages/account/src/errors: oauth.ts
Only in packages/account/src/errors: types.ts
Only in packages/account/src: errors.test.ts
Files packages/sdk/src/errors.ts and packages/account/src/errors.ts differ
Only in packages/account/src/helpers: index.ts
Only in packages/account/src/helpers: is-default.ts
Only in packages/account/src/helpers: is-expired.ts
Files packages/sdk/src/index.ts and packages/account/src/index.ts differ
Only in packages/account/src: internal.ts
Only in packages/account/src: oauth.test.ts
Files packages/sdk/src/oauth.ts and packages/account/src/oauth.ts differ
Only in packages/account/src: request.ts
Only in packages/account/src/resources: app-memberships.ts
Only in packages/account/src/resources: apps.ts
Only in packages/account/src/resources: audit-events.ts
Only in packages/account/src/resources: auth.ts
Only in packages/account/src/resources: features.ts
Only in packages/account/src/resources: mobile-number-verifications.ts
Only in packages/account/src/resources: mobile-numbers.ts
Only in packages/account/src/resources: oauth-grants.ts
Only in packages/account/src/resources: orgs.ts
Only in packages/account/src/resources: products.ts
Only in packages/account/src/resources: users.ts
Only in packages/account/src: resources.test.ts
Only in packages/account/src/types: api.ts
Only in packages/account/src/types: app-memberships.ts
Only in packages/account/src/types: apps.ts
Only in packages/account/src/types: audit-events.ts
Only in packages/account/src/types: auth.ts
Only in packages/account/src/types: features.ts
Only in packages/account/src/types: mobile-numbers.ts
Only in packages/account/src/types: oauth-grants.ts
Only in packages/account/src/types: oauth.ts
Only in packages/account/src/types: orgs.test.ts
Only in packages/account/src/types: orgs.ts
Only in packages/account/src/types: products.ts
Only in packages/account/src/types: users.test.ts
Only in packages/account/src/types: users.ts
Only in packages/account/src: validation.ts
--- admin/platform diff ---
Only in packages/platform/src: client.ts
Only in packages/platform/src: compat.ts
Only in packages/platform/src: helpers.ts
Files packages/admin/src/index.ts and packages/platform/src/index.ts differ
Only in packages/platform/src: internal.ts
Only in packages/platform/src: lookup.test.ts
Only in packages/platform/src: lookup.ts
Only in packages/platform/src: operator.ts
Only in packages/platform/src: request.ts
Only in packages/platform/src/resources: addresses.ts
Only in packages/platform/src/resources: api-keys.ts
Only in packages/platform/src/resources: app-access.ts
Only in packages/platform/src/resources: apps.test.ts
Only in packages/platform/src/resources: apps.ts
Only in packages/platform/src/resources: audit-events.ts
Only in packages/platform/src/resources: auth-attempts.test.ts
Only in packages/platform/src/resources: auth-attempts.ts
Only in packages/platform/src/resources: auth.test.ts
Only in packages/platform/src/resources: auth.ts
Only in packages/platform/src/resources: billing-accounts.ts
Only in packages/platform/src/resources: communications.ts
Only in packages/platform/src/resources: devices.test.ts
Only in packages/platform/src/resources: devices.ts
Only in packages/platform/src/resources: features.ts
Only in packages/platform/src/resources: memberships.ts
Only in packages/platform/src/resources: modules.test.ts
Only in packages/platform/src/resources: modules.ts
Only in packages/platform/src/resources: onboarding.test.ts
Only in packages/platform/src/resources: onboarding.ts
Only in packages/platform/src/resources: orgs.ts
Only in packages/platform/src/resources: prices.ts
Only in packages/platform/src/resources: products.ts
Only in packages/platform/src/resources: provisioning.ts
Only in packages/platform/src/resources: reserved-usernames.ts
Only in packages/platform/src/resources: sessions.test.ts
Only in packages/platform/src/resources: sessions.ts
Only in packages/platform/src/resources: subscriptions.ts
Only in packages/platform/src/resources: users.test.ts
Only in packages/platform/src/resources: users.ts
Only in packages/platform/src: runtime.ts
Only in packages/platform/src/test: server-only-stub.ts
Only in packages/platform/src: types.ts
```

Each comparison reports implementation files only in `account` / `platform`; the old trees contain only the listed shim files.

## Verification

`pnpm install --no-frozen-lockfile` completed successfully (already up to date; it refreshed the lockfile for the changed workspace manifests). The requested verification commands produced:

### `pnpm --filter @876/account typecheck && pnpm --filter @876/account test`

```text
$ tsc -p tsconfig.json --noEmit
$ vitest run

 RUN  v4.1.11 /root/projects/876/packages/account


 Test Files  6 passed (6)
      Tests  91 passed (91)
   Start at  23:08:11
   Duration  1.41s (transform 1.08s, setup 0ms, import 2.15s, tests 481ms, environment 1ms)

```

### `pnpm --filter @876/platform typecheck && pnpm --filter @876/platform test`

```text
$ tsc --noEmit
$ vitest run

 RUN  v4.1.11 /root/projects/876/packages/platform


 Test Files  9 passed (9)
      Tests  81 passed (81)
   Start at  23:08:06
   Duration  2.48s (transform 1.14s, setup 0ms, import 2.19s, tests 1.06s, environment 10ms)

```

### `pnpm --filter @876/workspace typecheck`

```text
$ tsc --noEmit
```

### `pnpm --filter @876/sdk typecheck && pnpm --filter @876/sdk test`

```text
$ tsc -p tsconfig.json --noEmit
$ vitest run --passWithNoTests

 RUN  v4.1.11 /root/projects/876/packages/sdk

No test files found, exiting with code 0

include: src/**/*.test.ts
exclude:  **/node_modules/**, **/.git/**

```

### `pnpm --filter @876/admin typecheck`

```text
$ tsc --noEmit
```

### `pnpm --filter @876/client typecheck`

```text
$ tsc --noEmit
```

### `pnpm --filter @876/core typecheck`

```text
$ tsc --noEmit
```

### `pnpm --filter @876/ui typecheck`

```text
$ tsc --noEmit
```

### `pnpm --filter @876/app typecheck`

```text
$ tsc --noEmit
```

### `pnpm --filter @876/enterprise typecheck`

```text
$ tsc --noEmit
```

### `pnpm --filter @876/console typecheck`

```text
$ tsc --noEmit
```

### `npx prettier --check "packages/{sdk,admin,account,platform,workspace}/**/*.{ts,json}"`

```text
Checking formatting...
All matched files use Prettier code style!
```

## Deliberately left alone

- No file under `apps/**` was edited by this pass.
- No file under `packages/crm/**` or `apps/crm/**` was edited.
- Existing uncommitted bounded-client, workspace, CRM, and application work was preserved.
- The legacy packages remain present by design; their legacy test source was removed with the duplicate implementation, and their test commands use Vitest's `--passWithNoTests` compatibility setting.
