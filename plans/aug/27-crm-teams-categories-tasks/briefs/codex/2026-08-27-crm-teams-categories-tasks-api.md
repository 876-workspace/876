# CRM API — teams, categories, subcategories, owner, note kinds, tasks, reminders

You are implementing **Phase A** of a CRM expansion. Scope is **`apps/crm-api/` only**.
Do **not** touch `apps/crm/`, `packages/crm/`, `packages/client/`, or any other workspace —
those are Phase B/C and are being written separately.

Read first, and follow them exactly:

- `.claude/rules/express-api.md` — module shape, layer rules, Zod-as-source-of-truth, error registry
- `.claude/rules/deletions.md` — soft delete + tombstones
- `.claude/rules/stripe-api-pattern.md` — `object` discriminators, `{data,error}`, list envelopes
- `.claude/rules/naming.md` — never rename an existing table/column/error code
- `.claude/rules/types.md`, `.claude/rules/code-style.md`

The existing `requests` and `customers` modules are the reference for every pattern
(routes → controller → service → repository, `crmError`, Unix-second serializers,
`crm_xxx_<uuid-no-dashes>` ids, `DELETION_MODE=hard` escape hatch). Match them.

---

## 1. Design decisions (already made — implement, do not redesign)

### Teams are CRM-local, not Core departments

`Request.teamId` currently holds a **Core `department` id** — a stopgap. CRM teams are
app-local operational data (`.claude/rules/platform-services.md` bucket 2), so they get
their own tenant-scoped tables and reference 876 users by **opaque id with no FK**.

The migration must therefore **null out every existing `crm_requests.team_id`** before
adding the FK — those values are department ids and are not valid team ids.

### Assignment semantics (Zendesk / Freshdesk model)

- A **team** is a queue. `teamId != null` with `assigneeId == null` is a valid, normal
  state meaning "sitting in that team's queue".
- **Changing the team clears an assignee who is not a member of the new team.** This is
  the single most important behaviour in this phase. Do it in `requests.service.update`,
  not the repository.
- Assigning a person is **not** restricted to team members (a lead helping out is normal),
  so do not reject a non-member assignee. Only the team-change rule clears.
- Clearing the team (`teamId: null`) leaves the assignee alone.

### Owner ≠ assignee

`Request.ownerId` is the durable relationship owner (account manager). `assigneeId` is
who is working the ticket now. Both nullable opaque user ids. Never conflate them.

### Categories replace the enum

`RequestCategory` stops being a Prisma enum and becomes an org-manageable table, because
the product requirement is that admins manage them in Settings. **Both category and
subcategory are nullable at the database level** — the UI may require them later, the
schema must not.

The migration seeds the seven current enum values as rows **per existing tenant**, backfills
`category_id` from the old enum column, then drops the column and the enum type.

A subcategory always belongs to exactly one category. The service must reject a
`subcategoryId` whose `categoryId` does not match the request's category.

### Note kinds

`RequestNoteKind` gains `EMAIL`. Email columns are added now and left unused — the product
is future-proofing for inbound email creating requests. `internal: Boolean` is **kept as
is** (renaming a column is forbidden); it is the public/private flag.

---

## 2. Schema — `apps/crm-api/prisma/schema/`

Create `team.prisma`, `category.prisma`, `task.prisma`; edit `request.prisma` and
`tenant.prisma`. Every model is tenant-scoped and carries `@@unique([tenantId, id])` so
composite relations work, exactly like `Request` does today.

### `team.prisma`

```prisma
enum TeamStatus { ACTIVE ARCHIVED }
enum TeamAutoAssign { NONE ROUND_ROBIN LEAST_BUSY }
enum TeamMemberRole { LEAD MEMBER }

model Team {
  id          String         @id
  tenantId    String         @map("tenant_id")
  name        String
  slug        String
  description String?
  color       String?        // a design-token key, never a raw hex
  isDefault   Boolean        @default(false) @map("is_default")
  autoAssign  TeamAutoAssign @default(NONE)  @map("auto_assign")
  status      TeamStatus     @default(ACTIVE)
  createdBy   String         @map("created_by")
  createdAt   DateTime       @default(now()) @map("created_at")
  updatedAt   DateTime       @updatedAt      @map("updated_at")
  deletedAt   DateTime?      @map("deleted_at")
  deletedBy   String?        @map("deleted_by")

  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  members     TeamMember[]
  requests    Request[]
  categories  RequestCategoryDef[]     @relation("CategoryDefaultTeam")
  subcategories RequestSubcategory[]   @relation("SubcategoryDefaultTeam")

  @@unique([tenantId, slug])
  @@unique([tenantId, id])
  @@index([tenantId, status, name])
  @@map("crm_teams")
}

model TeamMember {
  id        String         @id
  tenantId  String         @map("tenant_id")
  teamId    String         @map("team_id")
  userId    String         @map("user_id")   // opaque 876 user id, no FK
  role      TeamMemberRole @default(MEMBER)
  addedBy   String         @map("added_by")
  createdAt DateTime       @default(now()) @map("created_at")
  updatedAt DateTime       @updatedAt      @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  team   Team   @relation(fields: [tenantId, teamId], references: [tenantId, id], onDelete: Cascade)

  @@unique([tenantId, teamId, userId])
  @@index([tenantId, userId])
  @@map("crm_team_members")
}
```

Only one team per tenant may have `isDefault = true`. Enforce with a partial unique index
in the migration SQL (`WHERE is_default AND deleted_at IS NULL`) **and** by clearing the
previous default inside the same transaction in the repository.

### `category.prisma`

```prisma
model RequestCategoryDef {
  id              String           @id
  tenantId        String           @map("tenant_id")
  name            String
  slug            String
  description     String?
  color           String?
  sortOrder       Int              @default(0) @map("sort_order")
  isActive        Boolean          @default(true) @map("is_active")
  defaultTeamId   String?          @map("default_team_id")
  defaultPriority RequestPriority?  @map("default_priority")
  createdBy       String           @map("created_by")
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt      @map("updated_at")
  deletedAt       DateTime?        @map("deleted_at")
  deletedBy       String?          @map("deleted_by")

  tenant        Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  defaultTeam   Team?                @relation("CategoryDefaultTeam", fields: [tenantId, defaultTeamId], references: [tenantId, id], onDelete: SetNull)
  subcategories RequestSubcategory[]
  requests      Request[]

  @@unique([tenantId, slug])
  @@unique([tenantId, id])
  @@index([tenantId, isActive, sortOrder])
  @@map("crm_request_categories")
}

model RequestSubcategory {
  id              String           @id
  tenantId        String           @map("tenant_id")
  categoryId      String           @map("category_id")
  name            String
  slug            String
  description     String?
  sortOrder       Int              @default(0) @map("sort_order")
  isActive        Boolean          @default(true) @map("is_active")
  defaultTeamId   String?          @map("default_team_id")
  defaultPriority RequestPriority?  @map("default_priority")
  createdBy       String           @map("created_by")
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt      @map("updated_at")
  deletedAt       DateTime?        @map("deleted_at")
  deletedBy       String?          @map("deleted_by")

  tenant      Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  category    RequestCategoryDef @relation(fields: [tenantId, categoryId], references: [tenantId, id], onDelete: Cascade)
  defaultTeam Team?              @relation("SubcategoryDefaultTeam", fields: [tenantId, defaultTeamId], references: [tenantId, id], onDelete: SetNull)
  requests    Request[]

  @@unique([tenantId, categoryId, slug])
  @@unique([tenantId, id])
  @@index([tenantId, categoryId, isActive, sortOrder])
  @@map("crm_request_subcategories")
}
```

`slug` is generated server-side from `name` (lowercase, non-alphanumerics → `-`, collapse
repeats, trim, max 60 chars) and is **immutable after creation** — renaming a category
changes `name` only. Put the slugify helper in `src/modules/categories/categories.service.ts`
(not a shared util; it has one caller family).

### `task.prisma`

```prisma
enum TaskStatus { OPEN IN_PROGRESS DONE CANCELLED }
enum ReminderStatus { SCHEDULED SENT DISMISSED CANCELLED }

model RequestTask {
  id          String          @id
  tenantId    String          @map("tenant_id")
  requestId   String          @map("request_id")
  title       String
  description String?
  status      TaskStatus      @default(OPEN)
  priority    RequestPriority @default(NORMAL)
  assigneeId  String?         @map("assignee_id")
  dueAt       DateTime?       @map("due_at")
  completedAt DateTime?       @map("completed_at")
  completedBy String?         @map("completed_by")
  sortOrder   Int             @default(0) @map("sort_order")
  createdBy   String          @map("created_by")
  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt      @map("updated_at")
  deletedAt   DateTime?       @map("deleted_at")
  deletedBy   String?         @map("deleted_by")

  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  request Request @relation(fields: [tenantId, requestId], references: [tenantId, id], onDelete: Cascade)

  @@index([tenantId, requestId, status, sortOrder])
  @@index([tenantId, assigneeId, status])
  @@map("crm_request_tasks")
}

model RequestReminder {
  id          String         @id
  tenantId    String         @map("tenant_id")
  requestId   String         @map("request_id")
  title       String
  note        String?
  remindAt    DateTime       @map("remind_at")
  userId      String         @map("user_id")   // who is reminded
  status      ReminderStatus @default(SCHEDULED)
  sentAt      DateTime?      @map("sent_at")
  dismissedAt DateTime?      @map("dismissed_at")
  createdBy   String         @map("created_by")
  createdAt   DateTime       @default(now()) @map("created_at")
  updatedAt   DateTime       @updatedAt      @map("updated_at")
  deletedAt   DateTime?      @map("deleted_at")
  deletedBy   String?        @map("deleted_by")

  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  request Request @relation(fields: [tenantId, requestId], references: [tenantId, id], onDelete: Cascade)

  @@index([tenantId, requestId, remindAt])
  @@index([tenantId, userId, status, remindAt])
  @@map("crm_request_reminders")
}
```

### `request.prisma` edits

- **Delete** the `RequestCategory` enum and the `category` field.
- Add `categoryId String? @map("category_id")`, `subcategoryId String? @map("subcategory_id")`,
  `ownerId String? @map("owner_id")`.
- Change `teamId` to a real relation:
  `team Team? @relation(fields: [tenantId, teamId], references: [tenantId, id], onDelete: SetNull)`.
- Add relations to `category`, `subcategory`, `tasks`, `reminders`.
- Add `@@index([tenantId, categoryId, status])` and `@@index([tenantId, ownerId, status])`.
- `RequestNoteKind` gains `EMAIL`.
- `RequestNote` gains, all nullable:
  `emailMessageId String? @map("email_message_id")`,
  `emailDirection EmailDirection? @map("email_direction")` (`enum EmailDirection { INBOUND OUTBOUND }`),
  `emailFrom String? @map("email_from")`,
  `emailTo String[] @map("email_to")`, `emailCc String[] @map("email_cc")`,
  `emailSubject String? @map("email_subject")`.
  Add `@@index([tenantId, kind, createdAt])`.

### `tenant.prisma` edits

Add the back-relations: `teams`, `teamMembers`, `requestCategories`, `requestSubcategories`,
`requestTasks`, `requestReminders`.

---

## 3. Migration

**One** migration directory: `prisma/migrations/20260827090000_crm_teams_categories_tasks/migration.sql`.
Hand-write the SQL; do not rely on `prisma migrate dev` output alone (no database is
reachable here). It must run top-to-bottom on a live database in this order:

1. `CREATE TYPE` for `TeamStatus`, `TeamAutoAssign`, `TeamMemberRole`, `TaskStatus`,
   `ReminderStatus`, `EmailDirection`.
2. `ALTER TYPE "RequestNoteKind" ADD VALUE 'EMAIL';` — **must be its own statement before
   any statement that uses it**; Postgres cannot use a new enum value in the same
   transaction that added it. Put a comment saying so.
3. `CREATE TABLE` for `crm_teams`, `crm_team_members`, `crm_request_categories`,
   `crm_request_subcategories`, `crm_request_tasks`, `crm_request_reminders`, with every
   index and FK from the models above.
4. Partial unique index: `CREATE UNIQUE INDEX "crm_teams_default_unique" ON "crm_teams"("tenant_id") WHERE "is_default" AND "deleted_at" IS NULL;`
5. `UPDATE "crm_requests" SET "team_id" = NULL;` with a comment explaining these were
   Core department ids, not CRM team ids.
6. Add `crm_requests.category_id`, `subcategory_id`, `owner_id`; add the FKs.
7. Seed categories **per tenant** from the seven old enum values, generating ids as
   `'crm_cat_' || replace(gen_random_uuid()::text, '-', '')`, `created_by = 'system'`,
   `sort_order` 0..6, slugs `general|support|billing|sales|complaint|feedback|other`,
   names `General|Support|Billing|Sales|Complaint|Feedback|Other`. Insert for **every**
   row in `crm_tenants`, not only tenants that have requests.
8. Backfill `crm_requests.category_id` by joining the seeded rows on
   `(tenant_id, slug = lower(category::text))`.
9. `ALTER TABLE "crm_requests" DROP COLUMN "category";` then `DROP TYPE "RequestCategory";`
10. Add the six nullable email columns to `crm_request_notes` (`email_to`/`email_cc` as
    `TEXT[] NOT NULL DEFAULT '{}'`) and its new index.

---

## 4. Modules

Three new modules under `src/modules/`, each with the full five-file layer split plus
`__tests__/`, mounted in `src/http/routes.ts`.

### `teams/` — `/v1/organizations/:organizationId/teams`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | query: `status?`, `includeMembers?` (`'true'`) |
| POST | `/` | body: `name`, `description?`, `color?`, `isDefault?`, `autoAssign?`, `createdBy`, `members?: {userId, role?}[]` |
| GET | `/:id` | always includes members |
| PATCH | `/:id` | `name?`, `description?`, `color?`, `isDefault?`, `autoAssign?`, `status?` |
| DELETE | `/:id` | body `{ deletedBy, reason? }` → tombstone `{object:'team', id, deleted:true}` |
| GET | `/:id/members` | |
| POST | `/:id/members` | body `{ userId, role?, addedBy }`; idempotent — re-adding an existing member updates its role instead of erroring |
| PATCH | `/:id/members/:userId` | `{ role }` |
| DELETE | `/:id/members/:userId` | hard delete; membership is a join row, not a business record |

Deleting a team **must not** orphan requests: `onDelete: SetNull` covers a hard delete, and
for the soft-delete path the service sets `teamId = null` on that team's live requests in
the same transaction. Say so in a comment.

`object: 'team'` and `object: 'team_member'` discriminators.

### `categories/` — `/v1/organizations/:organizationId/request-categories`

CRUD as above plus nested subcategories at `/:id/subcategories` and
`/:id/subcategories/:subcategoryId`. `object: 'request_category'` /
`object: 'request_subcategory'`. A category serializes its `subcategories` array on
retrieve and on list (one `include`, never a query per row).

Deleting a category whose id is referenced by a live request must **fail** with a new
registry code `crm/category-in-use` (409) rather than silently nulling requests —
categories are reporting dimensions and losing them retroactively corrupts history.
Archiving (`isActive: false`) is the supported way to retire one. Same rule for
subcategories (`crm/subcategory-in-use`).

### `tasks/` — nested under requests

Extend the **existing** `requests` module rather than creating a fourth: add
`requests.tasks.*` and `requests.reminders.*` controller/service/repository functions and
mount them on the existing requests router:

- `GET|POST /:id/tasks`, `PATCH|DELETE /:id/tasks/:taskId`
- `GET|POST /:id/reminders`, `PATCH|DELETE /:id/reminders/:reminderId`

Setting a task's status to `DONE` stamps `completedAt`/`completedBy`; moving it off `DONE`
clears both. Mirror the resolvedAt/closedAt handling already in `requests.service.update`.
`object: 'request_task'` / `object: 'request_reminder'`.

If the file would exceed ~250 lines, split into `requests.tasks.service.ts` /
`requests.tasks.repository.ts` beside the existing ones — same module, extra files.

---

## 5. Changes to the existing `requests` module

- `listRequestsQuerySchema`: replace the `category` enum with `categoryId?: string`, add
  `subcategoryId?`, `ownerId?`, and keep the `'unassigned'`/`'none'` sentinel handling for
  `ownerId` that `teamId`/`assigneeId` already have.
- `createRequestBodySchema` / `updateRequestBodySchema`: replace `category` with
  `categoryId?: string | null`, add `subcategoryId?: string | null`, `ownerId?: string | null`.
- Serializer: emit `categoryId`, `subcategoryId`, `ownerId`; drop `category`.
- `requests.service.create`: when `categoryId` is given, resolve the category and apply its
  `defaultTeamId` / `defaultPriority` **only where the caller did not supply one**
  (subcategory defaults win over category defaults). Comment why: category-driven routing
  is the point of the table, but an explicit choice must never be overwritten.
- `requests.service.update`: implement the team-change assignee-clearing rule from §1, and
  validate that any supplied `subcategoryId` belongs to the resulting `categoryId`.
- Validate that `categoryId`/`subcategoryId`/`teamId` exist and are live for this tenant;
  otherwise `crm/category-not-found`, `crm/subcategory-not-found`, `crm/team-not-found`.

New error registry entries (add to `src/http/errors.ts`, keep alphabetical-ish grouping):
`crm/team-not-found` 404, `crm/team-slug-taken` 409, `crm/team-in-use` 409,
`crm/category-not-found` 404, `crm/category-slug-taken` 409, `crm/category-in-use` 409,
`crm/subcategory-not-found` 404, `crm/subcategory-slug-taken` 409,
`crm/subcategory-in-use` 409, `crm/subcategory-category-mismatch` 422,
`crm/task-not-found` 404, `crm/reminder-not-found` 404.

Update `src/types/request.ts` and add `src/types/team.ts`, `src/types/category.ts`,
`src/types/task.ts` to match. Remove the now-dead `RequestCategory` union.

---

## 6. Tests

Follow `.claude/rules/testing.md`. Add `__tests__/` beside each module. The existing
`apps/crm-api/src/modules/**/__tests__/` file is your style reference.

At minimum, and these are non-negotiable because they encode the design:

1. Changing a request's team **clears** an assignee who is not a member of the new team.
2. Changing a request's team **keeps** an assignee who *is* a member of the new team.
3. Clearing the team (`teamId: null`) leaves the assignee untouched.
4. Creating a request with a category applies the category's `defaultTeamId` when the
   caller supplied none, and does **not** when the caller supplied one.
5. A subcategory from a different category is rejected with `crm/subcategory-category-mismatch`.
6. Deleting a category referenced by a live request fails with `crm/category-in-use`.
7. Setting `isDefault` on a second team clears it on the first.
8. Adding an existing team member updates the role rather than erroring.
9. A task moved to `DONE` stamps `completedAt`; moved off `DONE` clears it.
10. Every list response asserts the full `{object:'list', data, has_more, total_count, url}`
    envelope, and every error test asserts the exact `code`.

Assert complete shapes, exact call arguments, and both sides of `{data,error}` — a bare
`toBeDefined()` is not a test.

---

## 7. Verification — run all of these, in the foreground, before reporting done

```
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api lint
pnpm --filter @876/crm-api test
npx prettier --write "apps/crm-api/**/*.{ts,prisma,sql}"
```

`prisma generate` runs as part of typecheck and must succeed — that is your schema-validity
gate, since no database is reachable.

**Do not commit anything.** Do not touch any workspace other than `apps/crm-api/`.
Report what you changed, what you could not verify, and any decision you had to make that
this brief did not cover.
