# Couriers — warehouse receiving model (phase 1 of 3)

## Context

In Caribbean freight forwarding, the "warehouse" is the US address a customer
ships their online purchases to. Two real-world arrangements exist, and the app
must support both:

1. **Owned** — the courier leases a unit/bay in a US industrial park and
   receives packages itself. Note that even here, several unrelated companies
   share one street address and disambiguate by unit/bay (e.g. two Jamaica
   forwarders both at 8005 NW 80th St, Miami FL 33166).
2. **Agent** — the courier has no US facility. A third-party receiving
   agent/consolidator receives on its behalf. The courier is issued a code at
   that facility, and every customer's shipping address carries that code plus
   the customer's mailbox number so the agent can sort by courier.

The address a customer is shown is therefore **not** simply the warehouse's
address. It is the warehouse address **with the customer's mailbox number
interpolated**, and different operations place that token differently:

- on the recipient line — `John Brown JMC1042`
- as its own second address line — `JMC1042`
- appended to the street line — `8005 NW 80th St, JMC1042`

Phase 1 (this brief) models that on the `Warehouse` record and exposes it in
the settings form. Phase 2 (a later brief) adds the address composer + customer
surfaces. Phase 3 stamps `warehouseId` onto `Package`. **Do not do phase 2 or
3 work here.**

## Scope — files you may touch

- `apps/couriers/prisma/schema/warehouse.prisma`
- `apps/couriers/prisma/migrations/20260802000000_warehouse_receiving_model/migration.sql` (new)
- `apps/couriers/src/types/warehouse.ts`
- `apps/couriers/src/lib/service/warehouses/{create,update,view}.ts`
- `apps/couriers/src/app/org/[orgSlug]/settings/warehouses/warehouse-form.tsx`
- `apps/couriers/src/app/org/[orgSlug]/settings/warehouses/warehouses-cards.tsx`
- `apps/couriers/src/app/org/[orgSlug]/settings/warehouses/warehouse-form.test.tsx`
- Regenerated Prisma client under `apps/couriers/src/lib/db/generated/`

**Do not touch:** any other app, any package under `packages/`, the `Package`
or `Manifest` models, `apps/couriers/src/lib/service/org-locations/`, or the
branches/locations feature.

## 1. Schema — `apps/couriers/prisma/schema/warehouse.prisma`

Add to `model Warehouse`, keeping the existing fields and doc comments intact:

```prisma
/// How the tenant gets packages received at this address.
enum WarehouseOperatingModel {
  /// The tenant leases or owns the facility and receives packages itself.
  OWNED
  /// A third-party receiving agent or consolidator receives on the tenant's behalf.
  AGENT
}

/// Where a customer's mailbox number is placed in the shipping address the
/// customer is given. Receiving operations differ on this and a package sent
/// with the token in the wrong place is a package that goes missing.
enum MailboxPlacement {
  /// Appended to the customer's name: "John Brown JMC1042".
  RECIPIENT_LINE
  /// Appended to the street line: "8005 NW 80th St, JMC1042".
  ADDRESS_LINE_1
  /// Its own line beneath the street: "JMC1042".
  ADDRESS_LINE_2
}
```

New `Warehouse` fields:

| Field              | Type                      | Map                 | Notes                                                                                                                              |
| ------------------ | ------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `operatingModel`   | `WarehouseOperatingModel` | `operating_model`   | `@default(OWNED)`                                                                                                                  |
| `agentName`        | `String?`                 | `agent_name`        | Trading name of the receiving agent. Meaningful only when `operatingModel` is `AGENT`.                                             |
| `code`             | `String?`                 |                     | The tenant's identifier at this facility, e.g. `JMC`. Printed before the mailbox number so the receiving operation can sort by courier. |
| `mailboxPlacement` | `MailboxPlacement`        | `mailbox_placement` | `@default(ADDRESS_LINE_2)`                                                                                                         |
| `mailboxPrefix`    | `String?`                 | `mailbox_prefix`    | Literal text printed immediately before the mailbox number, e.g. `"Suite "`, `"MB-"`. Kept separate from `code` because some operations use one, some both. |
| `instructions`     | `String?`                 |                     | Free text shown to customers alongside the shipping address.                                                                       |
| `isActive`         | `Boolean`                 | `is_active`         | `@default(true)`. A retired warehouse stays readable for historical packages.                                                      |

Add `@@index([tenantId, isActive], name: "warehouses_tenant_id_is_active_idx")`.

## 2. Migration

Write the SQL by hand at
`apps/couriers/prisma/migrations/20260802000000_warehouse_receiving_model/migration.sql`.
Follow the exact style of the existing
`20260801000000_link_org_locations/migration.sql`. It must:

- `CREATE TYPE "WarehouseOperatingModel"` and `"MailboxPlacement"`.
- `ALTER TABLE "warehouses" ADD COLUMN` for each new column, all nullable or
  defaulted so the migration is safe on existing rows.
- Create the new index.

Do **not** run `prisma migrate dev` (no database is reachable). Regenerate the
client only: `pnpm --filter @876/couriers prisma:generate` (check
`apps/couriers/package.json` for the exact script name and use it verbatim).

## 3. Types — `apps/couriers/src/types/warehouse.ts`

- Add `warehouseOperatingModelSchema` (`z.enum(['OWNED','AGENT'])`) and
  `mailboxPlacementSchema` (`z.enum(['RECIPIENT_LINE','ADDRESS_LINE_1','ADDRESS_LINE_2'])`),
  each with an exported inferred type.
- Extend `warehouseViewSchema` with the seven new fields (nullable where the
  column is nullable).
- Extend `warehouseCreateParamsSchema` / `warehouseUpdateParamsSchema`:
  - `operatingModel` optional, defaults handled server-side.
  - `agentName`, `code`, `mailboxPrefix`, `instructions` — trimmed optional
    text, blank string means absence. Reuse the `optionalText(max)` helper
    pattern already in `src/types/address.ts` (define a local copy; do not
    export one from `address.ts`). Maxes: `agentName` 120, `code` 16,
    `mailboxPrefix` 16, `instructions` 500.
  - `code` additionally uppercased and constrained to `/^[A-Z0-9-]+$/` with the
    message `Warehouse code may only contain letters, numbers and hyphens.`
  - `mailboxPlacement` optional.
  - `isActive` optional boolean.
- Keep the existing comment stating `tenantId`, `addressId` and `orgLocationId`
  are never client-controlled, and add `isPrimary` stays as-is.

## 4. Service

- `view.ts` — map the new columns onto the view.
- `create.ts` — persist the new fields. Keep the existing "first warehouse is
  always primary" transaction logic untouched. When `operatingModel` resolves
  to `OWNED`, store `agentName` as `null` regardless of what was submitted —
  an agent name on a self-operated warehouse is stale data waiting to be
  rendered.
- `update.ts` — same rule: if the resulting `operatingModel` is `OWNED`, null
  out `agentName`. Read the existing file first and match its structure and
  error handling exactly.
- Do not change `scheduleSync(...)` call sites or the org-location sync payload.

## 5. Form — `warehouse-form.tsx`

Add a card between the existing name card and the address card, titled
**Receiving** (use the same `876-card p-5` shell the other cards use):

- A select for **Operating model** — options "We operate this warehouse"
  (`OWNED`) / "A receiving agent operates it" (`AGENT`). Use the app's existing
  select primitive; find it by looking at another Couriers settings form rather
  than assuming an import path.
- **Agent name** input, rendered only when `operatingModel === 'AGENT'`.
- **Warehouse code** input, with the one-line hint
  `Printed before each customer's mailbox number.`

Add a second new card after the address card, titled **Customer address**:

- A select for **Mailbox number placement** with the three options labelled
  `On the recipient line`, `On the street line`, `On its own line`.
- **Prefix** input.
- **Instructions** textarea.

Follow `.claude/rules/app-layout.md` and the repo's UI-copy rule: no
explanatory paragraph under a heading; a single short inline hint under an
input is fine. Do not add green styling to anything.

## 6. Cards — `warehouses-cards.tsx`

Show a `Badge` reading `Agent` on warehouses whose `operatingModel` is `AGENT`,
and a muted `Inactive` badge when `isActive` is false. Do not restructure the
component otherwise.

## 7. Tests — `warehouse-form.test.tsx`

Read the existing file and extend it in the same style. Add cases:

- Submitting with `operatingModel` `AGENT` sends `agentName` in the create
  params, asserted with `toHaveBeenCalledWith` on the exact param object.
- Switching back to `OWNED` hides the agent-name input.
- The mailbox-placement select defaults to `ADDRESS_LINE_2` and its chosen
  value reaches the create call.

Follow `.claude/rules/testing.md`: assert exact arguments, never a bare
`toHaveBeenCalled()`.

## Verification — all must pass before you report done

```
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
pnpm --filter @876/couriers lint
```

## Rules to read before writing code

`.claude/rules/code-style.md`, `.claude/rules/types.md`,
`.claude/rules/sdk-conventions.md` (the app-local `service.<resource>.<verb>()`
layering), `.claude/rules/app-layout.md`, `.claude/rules/testing.md`.

## Do not

- Do not commit. The orchestrating agent stages and commits.
- Do not run `prisma migrate dev` or any command that needs a database.
- Do not add a free-form address template string — placement is a constrained
  enum on purpose.
- Do not touch `Package`, `Manifest`, or the org-location sync.
