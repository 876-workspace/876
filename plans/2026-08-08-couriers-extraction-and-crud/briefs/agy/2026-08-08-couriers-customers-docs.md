# Brief — document couriers customer management

You are updating **documentation only**. Do not modify any `.ts`, `.tsx`,
`.prisma`, `.sql`, or `.json` file. Do not run any code generator. Do not commit.

## Background you must read first (read fully, do not skim)

1. `.claude/rules/customer-architecture.md` — the three-layer customer model.
2. `apps/couriers/src/lib/manage/customers.ts` — the new orchestration module.
3. `apps/couriers/src/lib/finance/customers.ts` — the registry helpers.
4. `apps/couriers/prisma/schema/customer.prisma` — the `CourierCustomerProfile` model.
5. `apps/couriers/prisma/migrations/20260808000000_courier_customer_crud/migration.sql`.
6. `apps/couriers/src/lib/service/customer-profiles/` — every file in that folder.

## What just shipped (this is the subject of the documentation)

Staff can now create, view, edit, and archive a courier customer from
`/[orgSlug]/customers` in the couriers app. Before this change `/customers/new`
was a dead page and a customer could only come into existence by signing up
through the customer portal.

The three facts that matter and that a reader will get wrong if you omit them:

- `CourierCustomerProfile.userId` is now **nullable**. A staff-created customer
  has no 876 account, which was previously impossible to represent.
- A staff-created customer is an **`EXTERNAL`** customer in the shared Billing
  registry (Layer 2), created with `customerType: 'EXTERNAL'` and an idempotency
  key of `couriers:profile:<profileId>`, where the profile id is generated
  _before_ the registry call precisely so it can anchor that key. A
  portal-created customer is **`CORE_USER`** and is unchanged.
- Identity fields (first name, last name, company, email, phone) may be edited
  **only** on an `EXTERNAL` customer. On a `CORE_USER` customer the identity
  belongs to that person's 876 account, and the app returns
  `customer/identity-locked`.
- Deleting a customer is a **soft delete**: `deleted_at` / `deleted_by` /
  `deletion_reason` are written on the courier profile, and every read filters
  `deletedAt: null`. The shared Billing registry customer is **not** archived,
  because other 876 apps in the same organization may still have that party as
  their customer.

## Task 1 — new file `apps/couriers/docs/customers.md`

Create it. Structure, in this order, with these exact `##` headings:

```
# Customer management

## The two kinds of courier customer
## Creating a customer
## Editing a customer
## Archiving a customer
## Where each field lives
```

Requirements:

- Under **The two kinds of courier customer**, give a Markdown table with the
  columns `Kind` | `Created by` | `Has an 876 account?` | `Identity editable in
couriers?` and exactly two rows (`EXTERNAL`, `CORE_USER`).
- Under **Creating a customer**, list the ordered steps the code actually
  performs, taken from `createManagedCustomer` — mailbox allocation, registry
  create, profile create — and state plainly that a registry row orphaned by a
  failed profile write is intentional and is reused on retry via the idempotency
  key.
- Under **Where each field lives**, give a table with columns `Field` | `Layer`
  | `Owned by` covering: name, company, email, phone, mailbox number, home
  branch, status, TRN, commercial flag. Layer 2 = the Billing registry, Layer 3
  = `courier_customer_profiles`.
- Cite real file paths in backticks. Every path you cite must exist — verify
  each one with a file read before you write it down.
- Do **not** invent API endpoints, function names, or field names. If you cannot
  confirm something from the source, leave it out.
- No marketing prose, no "in today's fast-moving logistics industry" openers.
  Plain declarative sentences.

## Task 2 — update the follow-up list in the customer-architecture rule

In `.claude/rules/customer-architecture.md`, find the section
`## Known follow-ups (not yet implemented)`. One bullet currently reads roughly:

> - Couriers: customer import + `/customers/new` (both currently dead UI) —
>   requires nullable `CourierCustomerProfile.userId` plus a claim-at-enrollment
>   flow (match by verified email against registry EXTERNAL rows, then `link`).

Replace **only that bullet** with two bullets:

- one recording that `/customers/new` and staff-created `EXTERNAL` customers
  **are now implemented**, that `userId` is nullable, and pointing at
  `apps/couriers/docs/customers.md`;
- one recording what is **still outstanding**: bulk customer **import**, and the
  claim-at-enrollment flow that links an existing `EXTERNAL` customer to an 876
  account when that person later signs up through the portal (match by verified
  email, then `customers.link`).

Change nothing else in that file. Do not reword neighbouring bullets, do not
reflow paragraphs, do not touch any other section.

## Task 3 — mirror the rule change into the other two rule trees

`.claude/rules/` is the canonical copy. The same file exists at:

- `.agents/rules/customer-architecture.md`
- `.grok/rules/customer-architecture.md`

Apply **the identical bullet replacement** to both. The only permitted
difference between the three copies is that relative links use
`.claude/rules/`, `.agents/rules/`, and `.grok/rules/` respectively — preserve
whatever prefix each file already uses; do not rewrite links to point at
`.claude/`.

After editing, verify the three files differ only in those link prefixes:

```bash
diff <(sed 's|\.agents/rules/|.claude/rules/|g' .agents/rules/customer-architecture.md) .claude/rules/customer-architecture.md
diff <(sed 's|\.grok/rules/|.claude/rules/|g' .grok/rules/customer-architecture.md) .claude/rules/customer-architecture.md
```

Both diffs must print nothing. If either prints anything, fix it and re-run.

## Files you may touch — this is the complete list

```
apps/couriers/docs/customers.md          (create)
.claude/rules/customer-architecture.md   (one bullet → two bullets)
.agents/rules/customer-architecture.md   (same)
.grok/rules/customer-architecture.md     (same)
```

Touching anything else is a failure of this task.

## Verify before reporting done

```bash
pnpm exec prettier --check "apps/couriers/docs/customers.md" ".claude/rules/customer-architecture.md" ".agents/rules/customer-architecture.md" ".grok/rules/customer-architecture.md"
git status --short
```

`git status --short` must list exactly the four files above and nothing else.
Run `pnpm exec prettier --write` on them if the check fails, then re-run it.
Report the final output of both commands verbatim.
