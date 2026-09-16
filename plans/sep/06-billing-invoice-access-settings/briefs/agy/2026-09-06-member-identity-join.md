# Task — join workspace grants onto organization identities

## Context

The finance plane (`apps/billing-api`) stores only an opaque 876 account id on a
workspace grant. Names, emails and avatars live in the identity plane. Three
call sites currently map a grant straight into a display row, so a members
table renders raw `user_…` ids instead of people.

`packages/billing-ui/src/panels/access/member-identity.ts` **already exists** and
does the join. Read it first. It exports:

- `type MemberIdentity = { userId, firstName, lastName, email, avatarUrl }`
- `type FinanceGrant = { userId, roleId, roleName, status, joinedAt? }`
- `toFinanceMemberSummaries(grants, identities): FinanceMemberSummary[]`

Import path: `@876/billing-ui/panels/access/member-identity` (already exported
in that package's `package.json`).

## Edit exactly these three files

### 1. `apps/billing/src/app/(app)/settings/roles/[roleId]/page.tsx`

It currently builds `members` with an inline `.map` that reads
`member.firstName`, `member.email` and `member.avatar` off the finance
projection. **Those fields do not exist at runtime** — that is the bug.

Replace it: also load the organization roster with
`loadUsers(context.orgId)` from `../../users/_data` (already exported), run
both loads in the existing `Promise.all`, and build `members` with
`toFinanceMemberSummaries(...)`.

- grants: `roster.members.filter((m) => m.roleId === role.id)` mapped to
  `{ userId: m.userId, roleId: m.roleId, roleName: m.roleName, status: m.status }`
- identities: the org members mapped to
  `{ userId: u.user_id, firstName: u.first_name, lastName: u.last_name, email: u.email, avatarUrl: u.avatar }`

`loadUsers` returns `{ members, error }`; ignore its error here — the roster is
supporting data and the role card must still render without it.

### 2. `apps/billing/src/app/(app)/settings/users/_components/users-list-data.tsx`

Same defect in the `<BillingMembersTablePanel members={...}>` prop. It already
has `result.members` (the org roster) and `billing.members` (the grants) in
scope. Replace the inline `.map` with `toFinanceMemberSummaries(...)` using the
same two mappings as above.

### 3. `apps/invoice/src/app/(app)/settings/roles/[roleId]/page.tsx`

It currently sets `name: member.userId` and `email: ''`. Load the roster with
`loadUsers(context.context.orgId)` from
`@/app/(app)/settings/users/_data` — use the correct relative path — add it to
the existing `Promise.all`, and build `members` with
`toFinanceMemberSummaries(...)`. The grant's role name is `member.role.name`.

## Add tests

Create `packages/billing-ui/src/panels/access/member-identity.test.ts` with at
least **10** `it()` cases. Required by name:

- a grant whose identity is present renders "First Last";
- an identity with no first/last name falls back to its email;
- a grant with **no** matching identity is still returned, labelled with the
  account id, and is not dropped;
- the email is `''` and the avatar `null` when no identity matches;
- `joinedAt` defaults to `null` when the grant omits it;
- the returned array has exactly one entry per grant, in grant order;
- neither input array is mutated;
- a duplicate identity for the same `userId` does not duplicate the row.

Use realistic domain data (e.g. `user_2kL9mN4q`, `raheem@efesto.example`), not
`foo`/`bar`. Assert complete objects with `toEqual`, not `toBeDefined`.

## Verify — all four must pass

```bash
pnpm --filter @876/billing-ui typecheck
pnpm --filter @876/billing-ui test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
```

## Constraints

- Do not change `member-identity.ts` itself — it is already correct.
- Do not touch any other file, any route handler, `packages/core`,
  `packages/billing`, or `apps/billing-api`.
- No `as any`, no `@ts-ignore`, no `eslint-disable`, no barrel `index.ts`.
- Do not commit and do not create a branch.
- Report what you changed and the counted number of `it()` cases to
  `plans/2026-09-06-billing-invoice-access-settings/reports/agy/2026-09-06-member-identity-join.md`.
