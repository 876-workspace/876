# CRM clients — teams, categories, tasks, reminders, richer notes

**Phase B** of the CRM expansion. Scope is **`packages/crm/` and `packages/client/` only**.
Do not touch `apps/crm-api/` (Phase A, already done — read it as the contract) or
`apps/crm/` (Phase C, separate).

Read first: `.claude/rules/sdk-conventions.md` (verb vocabulary, tiering, no bespoke flat
wrappers), `.claude/rules/stripe-api-pattern.md` (`object` discriminators, `{data,error}`,
list envelopes), `.claude/rules/types.md`, `.claude/rules/code-style.md`.

**The API is the source of truth.** Before writing anything, read
`apps/crm-api/src/modules/{teams,categories,requests}/*.schemas.ts` and `*.service.ts`
and mirror the serialized shapes exactly — field names, nullability, Unix-second
timestamps, `object` literals. Where this brief and the API disagree, the API wins;
say so in your report.

---

## 1. `packages/crm/`

`src/resources/requests.ts` is your reference for a resource module: a `root()` path
helper, a `toQueryString()` for list filters, and one method per verb over `request()`
with a Zod response schema. Every new resource follows that shape exactly.

### New resource modules

| File | Path root | Verbs |
| --- | --- | --- |
| `src/resources/teams.ts` | `/v1/organizations/{orgId}/teams` | `list`, `retrieve`, `create`, `update`, `delete`, plus `members.list`, `members.add`, `members.update`, `members.remove` |
| `src/resources/request-categories.ts` | `/v1/organizations/{orgId}/request-categories` | `list`, `retrieve`, `create`, `update`, `delete`, plus `subcategories.create`, `subcategories.update`, `subcategories.delete` |
| `src/resources/request-tasks.ts` | `/v1/organizations/{orgId}/requests/{requestId}/tasks` | `list`, `create`, `update`, `delete` |
| `src/resources/request-reminders.ts` | `/v1/organizations/{orgId}/requests/{requestId}/reminders` | `list`, `create`, `update`, `delete` |

Nested groups (`members`, `subcategories`) are plain nested objects on the returned
resource, not separate top-level resources — they have no identity outside their parent.

### `src/types.ts` additions

Add Zod schemas + inferred types, keeping the existing ordering convention (schema, then
`export type X = z.infer<typeof xSchema>`), then export every new name from
`src/index.ts`:

- `teamStatusSchema`, `teamAutoAssignSchema`, `teamMemberRoleSchema`
- `teamMemberSchema` (`object: 'team_member'`), `teamSchema` (`object: 'team'`, with
  `members: z.array(teamMemberSchema).optional()`), `teamListSchema`
- `CreateTeamInput`, `UpdateTeamInput`, `AddTeamMemberInput`, `UpdateTeamMemberInput`
- `requestSubcategorySchema` (`object: 'request_subcategory'`),
  `requestCategorySchema` (`object: 'request_category'`, with
  `subcategories: z.array(requestSubcategorySchema)`), `requestCategoryListSchema`
- `requestCategorySchema` and `requestSubcategorySchema` both carry
  `icon: z.string().nullable()` — a **key** from the closed catalog in
  `@876/ui/category-icons`, never a component and never a free-text icon name.
  Type it as a plain `string` in the client, not as `CategoryIconKey`: the value
  comes from a database that may hold a key written by an older build, and the
  UI narrows it at render time with `isCategoryIconKey`. A client that refuses to
  parse an unknown key would fail the whole customer's category list over one
  retired glyph.
- `CreateRequestCategoryInput`, `UpdateRequestCategoryInput`,
  `CreateRequestSubcategoryInput`, `UpdateRequestSubcategoryInput`
- `taskStatusSchema`, `requestTaskSchema` (`object: 'request_task'`),
  `requestTaskListSchema`, `CreateRequestTaskInput`, `UpdateRequestTaskInput`
- `reminderStatusSchema`, `requestReminderSchema` (`object: 'request_reminder'`),
  `requestReminderListSchema`, `CreateRequestReminderInput`, `UpdateRequestReminderInput`

### Breaking changes to existing types

These are deliberate — the API dropped the `RequestCategory` enum for a managed table.

1. **Delete `requestCategorySchema`'s old enum form** (`z.enum(['GENERAL', …])`) and the
   `RequestCategory` type. The name `requestCategorySchema` is **reused** for the new
   resource object. Make sure nothing still imports the enum meaning.
2. `crmRequestSchema`: drop `category`; add
   `categoryId: z.string().nullable()`, `subcategoryId: z.string().nullable()`,
   `ownerId: z.string().nullable()`.
3. `ListRequestsQuery` / `toQueryString`: drop `category`; add `categoryId`,
   `subcategoryId`, `ownerId` (with the same `'unassigned'` sentinel pass-through the
   existing `teamId`/`assigneeId` filters use).
4. `CreateRequestInput` / `UpdateRequestInput`: drop `category`; add `categoryId`,
   `subcategoryId`, `ownerId` — all `string | null | undefined`.
5. `requestNoteKindSchema`: add `'EMAIL'`.
6. `crmRequestNoteSchema`: add the nullable email fields the API now serializes —
   `emailMessageId`, `emailDirection` (`z.enum(['INBOUND','OUTBOUND']).nullable()`),
   `emailFrom`, `emailSubject`, all `.nullable()`, plus
   `emailTo: z.array(z.string())` and `emailCc: z.array(z.string())`.
7. **`registryCustomerSchema`** — this one matters for the UI and is currently the reason
   an organization customer renders a person's email as if it were the org's.

   The schema is `.passthrough()`, so the Billing registry's real fields already arrive at
   runtime but are invisible to TypeScript. Declare them:

   ```ts
   organizationId: z.string().nullable().optional(),
   userId: z.string().nullable().optional(),
   primaryContact: z
     .object({
       object: z.literal('contact'),
       id: z.string(),
       userId: z.string().nullable(),
       firstName: z.string().nullable(),
       lastName: z.string().nullable(),
       email: z.string().nullable(),
       workPhone: z.string().nullable(),
       mobilePhone: z.string().nullable(),
       isPrimary: z.boolean(),
     })
     .nullable()
     .optional(),
   ```

   `packages/billing/src/integration/types/customer.schema.ts` is the authority for these
   field names — match it, and keep `.optional()` so an older Billing deployment that
   omits the field does not fail validation for the whole customer.

### `src/client.ts`

Compose the four new resources onto the returned object:
`teams`, `requestCategories`, `requestTasks`, `requestReminders`.

---

## 2. `packages/client/`

1. `src/composers/crm.ts` — expose the new resources on the CRM surface:
   `teams: crm.teams`, `requestCategories: crm.requestCategories`,
   `requestTasks: crm.requestTasks`, `requestReminders: crm.requestReminders`.
2. `src/resource-manifest.ts` — add manifest entries under the CRM block, each with
   `owner: 'crm'` and a one-line `meaning`:
   - `teams` — "CRM routing teams (queues) an organization assigns requests to"
   - `requestCategories` — "org-managed CRM request category and subcategory catalog"
   - `requestTasks` — "actionable follow-up items on a CRM request"
   - `requestReminders` — "time-based reminders on a CRM request"
3. `src/index.ts` — re-export the new public types from `@876/crm`, following the existing
   `Crm`-prefixed aliasing convention already used for requests and notes
   (e.g. `Team as CrmTeam`, `CreateTeamInput as CrmTeamCreateInput`,
   `RequestTask as CrmRequestTask`, …). Keep alphabetical grouping within the CRM block.
4. `src/crm-surface.test.ts` — extend the existing assertions so the new resources are
   covered: they exist on a CRM-composed client, and `RESOURCE_MANIFEST.<name>.owner`
   is `'crm'` for each.

**`teams` is a genuinely new canonical noun.** Check `RESOURCE_MANIFEST` and
`docs/platform-object-model.md` for an existing `teams` entry before adding one — Console
has a `team` service concept over its own datastore. If a collision exists, do **not**
invent a second meaning silently: report it and leave the entry out, and I will decide.

---

## 3. Tests

Follow `.claude/rules/testing.md`. `packages/crm/src/client.test.ts` is the reference:
a stubbed `fetch`, asserting the exact method, URL, headers, and body for each call, and
both sides of the `{data,error}` result.

Add, at minimum:

- One test per new resource asserting the **exact request URL** (including the encoded
  organization id and request id) and the HTTP method.
- A team `create` sending `members` through in the body unchanged.
- A `requests.list` call proving `categoryId`, `subcategoryId`, and `ownerId` reach the
  query string, and that a `category` key is no longer produced.
- A response-validation failure test: a malformed team payload resolves to
  `{data: null, error: {...}}` rather than throwing.
- A `registryCustomerSchema` test proving a customer **with** `primaryContact` keeps it and
  a customer **without** the field still parses.

---

## 4. Verification — foreground, all of them, before reporting done

```
pnpm --filter @876/crm typecheck
pnpm --filter @876/crm lint
pnpm --filter @876/crm test
pnpm --filter @876/client typecheck
pnpm --filter @876/client lint
pnpm --filter @876/client test
npx prettier --write "packages/crm/src/**/*.ts" "packages/client/src/**/*.ts"
```

Dropping the `category` enum will break `apps/crm/` typecheck. That is expected and is
Phase C's job — **do not edit `apps/crm/` to fix it**. Just list the breakages you saw in
your report so Phase C can be aimed at them.

**Do not commit anything.**
