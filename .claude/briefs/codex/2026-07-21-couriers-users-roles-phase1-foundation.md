# Phase 1 brief — Couriers Users & Roles foundation (schema, catalog, services, provisioning)

**Model/run:** codex `gpt-5.6-sol`, reasoning effort high, workspace-write.
**Goal:** implement the complete data + service foundation for org Users & Roles in
`apps/couriers`, exactly as specified below, and **do not stop until
`pnpm --filter @876/couriers typecheck` AND `pnpm --filter @876/couriers test` both
pass clean**. Do NOT commit anything. Do NOT touch any file outside the scope list.
Read `.agents/rules/code-style.md`, `.agents/rules/types.md`,
`.agents/rules/testing.md`, and `.agents/rules/sdk-conventions.md` before writing
code, and `.claude/tracker/exploration-users-roles.md` for the cited patterns.

## Context you must not re-derive (decisions are final)

876 Couriers is a multitenant freight-forwarding SaaS. Each org (core platform
organization) maps to one app-local `Tenant` (`apps/couriers/prisma/schema/tenant.prisma`).
We are adding **app-local, tenant-scoped access roles and team-member grants**:

- Roles are per-app; the core platform org role (owner/admin/member) is untouched.
- **Permission keys** are `<module>.<action>` snake_case strings. Standard actions:
  `view`, `create`, `edit`, `delete`. Modules may add extra module-specific keys
  (`<module>.<extra>`). "Full" is a UI concept only — never a stored key.
- **Provisioned default roles** per tenant: `Admin` (every permission) and `Staff`
  (every permission except the `reports` and `settings` modules). Default roles are
  marked by `systemKey` (`'admin' | 'staff'`), are **not editable and not
  deletable**, and their permission sets are **resolved from the catalog at read
  time — never stored** (so new modules automatically flow into them). Custom
  roles store an explicit string[] of keys.
- `StaffMember`/`StaffPosition` are unrelated HR records — do not touch them.

## Files to create/modify (exact scope — nothing else)

### 1. Prisma schema: `apps/couriers/prisma/schema/team.prisma` (new)

```prisma
/// Tenant-scoped access role for the couriers app. Default (provisioned) roles are
/// marked by systemKey ('admin' | 'staff'); their permissions resolve from the code
/// catalog at read time and the stored permissions array stays empty. Custom roles
/// store explicit permission keys ('<module>.<action>').
model Role {
  id          String  @id @default(cuid())
  tenantId    String  @map("tenant_id")
  name        String
  description String  @default("")
  systemKey   String? @map("system_key")
  permissions Json    @default("[]")
  createdAt   Int     @map("created_at")
  updatedAt   Int     @map("updated_at")

  tenant  Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  members TeamMember[]

  @@unique([tenantId, name], name: "roles_tenant_id_name_key")
  @@unique([tenantId, systemKey], name: "roles_tenant_id_system_key_key")
  @@index([tenantId], name: "roles_tenant_id_idx")
  @@map("roles")
}

/// A team member: an app access grant tying an opaque 876 user ID to a tenant and
/// an app-local role. Identity (name/email/avatar) is resolved through the platform
/// client at read time — never stored. Distinct from StaffMember (HR record).
model TeamMember {
  id        String           @id @default(cuid())
  tenantId  String           @map("tenant_id")
  userId    String           @map("user_id")
  roleId    String           @map("role_id")
  status    TeamMemberStatus @default(ACTIVE)
  createdAt Int              @map("created_at")
  updatedAt Int              @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  role   Role   @relation(fields: [roleId], references: [id], onDelete: Restrict)

  @@unique([tenantId, userId], name: "team_members_tenant_id_user_id_key")
  @@index([tenantId], name: "team_members_tenant_id_idx")
  @@index([roleId], name: "team_members_role_id_idx")
  @@map("team_members")
}

enum TeamMemberStatus {
  ACTIVE
  INACTIVE
}
```

Add the back-relations `roles Role[]` and `teamMembers TeamMember[]` to `Tenant`
(`apps/couriers/prisma/schema/tenant.prisma`).

### 2. Migration: `apps/couriers/prisma/migrations/20260721000000_team_roles/migration.sql` (new)

Hand-author SQL matching the existing style (`-- CreateTable` / `-- CreateIndex` /
`-- AddForeignKey` section comments, quoted snake_case identifiers — see
`20260701000000_baseline/migration.sql`). Tables `roles` and `team_members`,
enum `TeamMemberStatus`, all uniques/indexes/FKs from the schema above
(`ON DELETE CASCADE` tenant FKs, `ON DELETE RESTRICT` role FK on team_members).
Then run `pnpm --filter @876/couriers db:generate` (or the repo's generate script —
check `apps/couriers/package.json`) so the generated client includes the models.
Do NOT run `prisma migrate dev` against a database.

### 3. `apps/couriers/src/lib/db/index.ts`

Export `Role`, `TeamMember`, `TeamMemberStatus` types alongside the existing type
exports, and register both models in the ID-generation extension (read lines
22–49 first and follow the existing prefix scheme exactly; pick prefixes
consistent with it, e.g. `role_` and `tmem_`).

### 4. Types (per `.agents/rules/types.md` — contracts live in `src/types/`)

**`apps/couriers/src/types/permissions.ts` (new)** — app-agnostic permission
structure (this exact shape is the portable standard for future 876 apps):

```ts
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete'

export interface PermissionExtra {
  /** Key segment after the module, e.g. 'export' in 'customers.export'. */
  key: string
  label: string
}

export interface PermissionModule {
  /** snake_case module key — the prefix of every permission in the module. */
  key: string
  label: string
  /** Standard actions this module supports, in matrix column order. */
  actions: PermissionAction[]
  /** Module-specific "other" permissions (Zoho-style more-permissions). */
  extras: PermissionExtra[]
}

export type PermissionCatalog = PermissionModule[]

export type DefaultRoleKey = 'admin' | 'staff'
```

**`apps/couriers/src/types/role.ts` (new)** — Zod schemas + inferred types
(camelCase `…Schema` naming, `z.strictObject`, follow `apps/console/src/types/role.ts`
as the shape precedent but id-keyed):

- `RoleView`: `{ id, name, description, permissions: string[], isDefault: boolean, systemKey: 'admin' | 'staff' | null, memberCount: number, createdAt: number, updatedAt: number }`
- `RoleCreateParams`: `{ name: string (1..64, trimmed), description?: string (<=280), permissions: string[] }`
- `RoleUpdateParams`: all of name/description/permissions optional
- `DeletedRole`: `{ id: string, deleted: true }`

**`apps/couriers/src/types/team.ts` (new):**

- `TeamMemberStatusValue = 'active' | 'inactive'` (lowercase at the contract
  boundary; map to/from the Prisma enum in the service layer)
- `TeamMemberView`: `{ id, userId, roleId, roleName: string, roleSystemKey: 'admin' | 'staff' | null, status: TeamMemberStatusValue, createdAt: number, updatedAt: number }`
- `TeamMemberCreateParams`: `{ userId: string, roleId: string }`
- `TeamMemberUpdateParams`: `{ roleId?: string, status?: TeamMemberStatusValue }`
- `TeamMemberEnsureParams`: `{ userId: string, systemKey: DefaultRoleKey }`
- `DeletedTeamMember`: `{ id: string, deleted: true }`

### 5. Permission catalog: `apps/couriers/src/lib/permissions/catalog.ts` (new) + `apps/couriers/src/lib/permissions/index.ts` (new)

The couriers catalog (order = matrix row order; labels title-case):

| key          | label      | actions                    | extras                                                   |
| ------------ | ---------- | -------------------------- | -------------------------------------------------------- |
| `items`      | Items      | view, create, edit, delete | —                                                        |
| `customers`  | Customers  | view, create, edit, delete | `import` "Import customers", `export` "Export customers" |
| `packages`   | Packages   | view, create, edit, delete | `export` "Export packages"                               |
| `pre_alerts` | Pre-alerts | view, create, edit, delete | —                                                        |
| `warehouse`  | Warehouse  | view, create, edit, delete | —                                                        |
| `manifests`  | Manifests  | view, create, edit, delete | —                                                        |
| `deliveries` | Deliveries | view, create, edit, delete | —                                                        |
| `invoices`   | Invoices   | view, create, edit, delete | —                                                        |
| `payments`   | Payments   | view, create, edit, delete | —                                                        |
| `reports`    | Reports    | view                       | —                                                        |
| `settings`   | Settings   | view, edit                 | —                                                        |

Helpers (pure, exported, in `catalog.ts` or a sibling `helpers.ts` — your call,
composed via `index.ts`):

- `permissionKey(moduleKey, action)` → `` `${module}.${action}` ``
- `modulePermissionKeys(module)` → all keys of one module (actions + extras)
- `allPermissionKeys(catalog)` → every key, stable order
- `isValidPermissionKey(catalog, key)` → boolean
- `defaultRolePermissions(catalog, systemKey)` → `admin`: all keys; `staff`: all
  keys except modules `reports` and `settings`
- `resolveRolePermissions(role: { systemKey: string | null; permissions: unknown })`
  → for default roles ignore stored permissions and resolve from catalog; for
  custom roles sanitize the stored value (must be a string[] filtered to valid keys)
- `DEFAULT_ROLE_DEFINITIONS`: `{ admin: { name: 'Admin', description: 'Unrestricted access to every module.' }, staff: { name: 'Staff', description: 'Access to every module except Reports and Settings.' } }`

### 6. Error codes

Locate the central couriers error registry used by `errFrom(code)`
(`apps/couriers/src/lib/service/result.ts:13-20` imports `getError` — find its
module and follow its exact pattern). Add client-safe codes (exact final names may
follow the registry's existing naming convention):

- role not found (404), role name taken (409), default role immutable (400),
  role in use / has members (409), invalid permission key (400)
- team member not found (404), user already a member (409), role not found for
  assignment (400), last active admin protected (400)

### 7. Services

Follow the existing two-layer pattern exactly: one file per verb under
`apps/couriers/src/lib/service/roles/` and `.../team/`, composed by `index.ts`,
registered in the service root `apps/couriers/src/lib/service/index.ts`.
Reads return plain values/raw Prisma promises (`mailboxes/list.ts` precedent);
mutations return `ServiceResult<T>` via `ok`/`errFrom` (`mailboxes/allocate.ts`
precedent). Timestamps: `nowUnixSeconds()` assigned explicitly, both fields on
create, `updatedAt` on update (`tenants/create.ts` precedent). Every function
serializes Prisma rows to the `RoleView`/`TeamMemberView` contracts (status
lowercased, permissions resolved via `resolveRolePermissions`).

**`service.roles`:**

- `list(tenantId: string): Promise<RoleView[]>` — includes member counts
  (`_count`), ordered systemKey-first (admin, staff) then name asc.
- `retrieve(tenantId: string, roleId: string): Promise<RoleView | null>`
- `create(tenantId, params: RoleCreateParams): ServiceResult<RoleView>` —
  trim/validate name, validate every permission key against the catalog
  (reject unknown), reject a name colliding with any existing role (map P2002
  to the name-taken code).
- `update(tenantId, roleId, params: RoleUpdateParams): ServiceResult<RoleView>` —
  404 if missing; **reject if `systemKey != null`** (default role immutable);
  validate permissions like create.
- `delete(tenantId, roleId): ServiceResult<DeletedRole>` — 404 if missing;
  reject defaults; reject when the role has any team members (role-in-use code).
- `ensureDefaults(tenantId, tx?: PrismaTransactionClient): Promise<void>` —
  idempotent: upsert by the (tenantId, systemKey) unique for both `admin` and
  `staff` using `DEFAULT_ROLE_DEFINITIONS`; accepts an optional transaction
  client so `tenants.create` can call it transactionally (type the tx param the
  way Prisma's `$transaction` callback client is typed).

**`service.team`:**

- `list(tenantId): Promise<TeamMemberView[]>` — role included, ordered
  createdAt asc.
- `retrieve(tenantId, id): Promise<TeamMemberView | null>`
- `create(tenantId, params: TeamMemberCreateParams): ServiceResult<TeamMemberView>` —
  role must exist in tenant; P2002 → already-a-member.
- `ensure(tenantId, params: TeamMemberEnsureParams): ServiceResult<TeamMemberView>` —
  idempotent bootstrap: if a grant exists for (tenantId, userId) return it
  unchanged; otherwise `ensureDefaults` then create the grant with the default
  role for `systemKey`. (Used at provisioning and as the page-load self-heal for
  the org owner/admin.)
- `update(tenantId, id, params: TeamMemberUpdateParams): ServiceResult<TeamMemberView>` —
  404 if missing; new role must exist in tenant; **lockout guard**: if the change
  would leave the tenant with zero ACTIVE members holding the `admin` default
  role (deactivating or re-roling the last one), reject with the
  last-active-admin code.
- `delete(tenantId, id): ServiceResult<DeletedTeamMember>` — 404 if missing;
  same lockout guard.

### 8. Provisioning hook: `apps/couriers/src/lib/service/tenants/create.ts`

Extend `create` with an optional `ownerUserId?: string` param (extend the params
type where it is defined). Wrap the create in `prisma.$transaction`: create the
tenant, call `roles.ensureDefaults(tenant.id, tx)`, and when `ownerUserId` is
provided create the Admin `TeamMember` grant inside the same transaction. Preserve
the existing duplicate-slug/orgId error mapping behavior exactly. Then update both
callers to pass `ownerUserId: ctx.userId`:
`apps/couriers/src/app/api/manage/onboarding/complete/route.ts` and
`apps/couriers/src/app/api/manage/tenants/route.ts` (minimal diffs — only the new
param).

### 9. Tests (per `.agents/rules/testing.md` — read it; match existing couriers test style)

- `apps/couriers/src/lib/permissions/catalog.test.ts` — helpers: key building,
  full-catalog expansion, staff exclusion of reports/settings, invalid-key
  filtering in `resolveRolePermissions`, default-role resolution ignoring stored
  permissions, purity.
- `apps/couriers/src/lib/service/roles/roles.test.ts` and
  `apps/couriers/src/lib/service/team/team.test.ts` — use the hoisted
  Prisma-ref mock pattern from the testing rules (check how existing couriers
  service tests mock `@/lib/db`, e.g. near `result.test.ts` / any existing
  service test, and match it). Cover: happy paths, default-role immutability
  (update AND delete), role-in-use delete rejection, unknown permission key
  rejection, already-a-member conflict, ensure idempotency, last-active-admin
  lockout guard on update and delete, serialization shape (assert full objects,
  both `data` and `error` sides).

## Verification (must pass before you stop)

```bash
pnpm --filter @876/couriers db:generate   # or the repo's actual generate script
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
```

If a pre-existing test fails identically on the untouched tree, note it and move
on; anything your changes broke must be fixed. Iterate until green. Do not commit.
Write a short completion summary (what you created, any deviations and why) to
`.claude/tracker/phase1-report.md`.
