# Phase E — Document the customer contacts surface

Follow these instructions literally and in order. Do not improvise scope.

## Context you need

The repository just gained a **customer contacts** sub-resource. Contacts already existed
as a database table and were serialized inside a customer, but had no API, no client, and
no UI. Phases A–D added:

- API routes under `/api/v1/customers/:customerId/contacts` (list, create, retrieve,
  update, delete), in `apps/billing-api/src/modules/customers/`;
- a nested client resource `billing.customers.contacts.*` in
  `packages/billing/src/resources/customers.ts`;
- a shared `CustomerContactsPanel` in `packages/billing-ui/src/`;
- a **Contacts** tab on the customer record in `apps/billing` and `apps/invoice`.

## Step 1 — Read the code before writing a single word

Read these files in full. Every statement you write must come from them, not from this
brief:

1. `apps/billing-api/src/modules/customers/customers.routes.ts`
2. `apps/billing-api/src/modules/customers/customers.schemas.ts`
3. `apps/billing-api/src/modules/customers/customers.serializers.ts`
4. `apps/billing-api/src/modules/customers/customers.service.ts`
5. `packages/billing/src/resources/customers.ts`
6. `apps/billing-api/prisma/schema/contact.prisma`

If something in this brief contradicts the code, **the code wins** — and say so in your
report.

## Step 2 — Produce exactly these three edits

| # | File                                   | What to do                                                                                     |
| - | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1 | `apps/billing/docs/customer-contacts.md` | **Create.** A new document, structure given below.                                             |
| 2 | `packages/billing/README.md`             | **Edit.** Add a `contacts` subsection under wherever customers are already documented.         |
| 3 | `packages/billing-ui/README.md`          | **Edit.** Add a `CustomerContactsPanel` entry alongside the other panels already listed there. |

Do not create any other file. Do not edit any `.ts`, `.tsx`, `.prisma`, or `.json` file.
Do not edit any file under `.claude/` or `.agents/`.

## Step 3 — The structure for file 1

Use exactly these `##` headings, in this order:

```markdown
# Customer Contacts

## What a contact is

## The two kinds of contact

## API

## Client

## UI

## Rules that constrain this surface
```

Content requirements per section:

- **What a contact is** — a person attached to a customer. Two to four sentences. State
  that `userId` is an opaque 876 reference with no cross-database foreign key.
- **The two kinds of contact** — a hand-entered contact versus a Core-linked contact
  (`userId` set). Explain that a linked contact's name, email and avatar are **snapshots
  refreshed by the platform sync**, and are therefore read-only: a hand edit would be
  silently reverted on the next sync. Use a two-column Markdown table.
- **API** — one Markdown table of the five routes with columns
  `Method | Path | Permission`. Take the real paths and permissions **from
  `customers.routes.ts`**, not from memory.
- **Client** — a fenced `ts` block showing the five calls, copied to match the real
  signatures in `packages/billing/src/resources/customers.ts`.
- **UI** — where the Contacts tab lives in each app, and that the shared panel renders but
  does not fetch.
- **Rules that constrain this surface** — a short bullet list linking to
  `.claude/rules/customer-architecture.md`, `.claude/rules/finance-app-parity.md`, and
  `.claude/rules/sdk-conventions.md`, each with one sentence saying what it governs here.

Additionally, state these three server-owned invariants somewhere in the document, in
your own words:

1. At most one contact per customer is primary; promoting one demotes the incumbent in the
   same transaction.
2. A Core-linked contact rejects edits to its snapshot fields.
3. The last contact of a `CORE_ORGANIZATION` customer cannot be deleted.

## Step 4 — Style rules you must follow

- Wrap prose at 80 columns.
- Use `##` and `###` only — never a bold line standing in for a heading.
- No emoji anywhere.
- Do not write a description paragraph under a heading that merely restates the heading.
  The repository forbids this (root `CLAUDE.md`, "UI Copy") and it applies to docs too.
- Fenced code blocks always carry a language tag (```ts, ```bash, ```text).
- American spelling, present tense, second person where you address the reader.
- Match the tone of the existing `apps/billing/docs/accounting-model.md` — read it first
  and mirror its register.

## Step 5 — Do not do these things

- Do not create a branch, commit, push, or open a pull request. Leave every change
  uncommitted in the working tree.
- Do not run any test, build, typecheck, lint, or `prisma` command.
- Do not modify source code to make the documentation true.
- Do not invent a route, a parameter, a field, or an error code that you did not read in
  the source files listed in Step 1.
- Do not document anything as "coming soon" or "planned".

## Step 6 — Verification you must perform

Run only these two, and paste their output into your report:

```bash
npx prettier --check apps/billing/docs/customer-contacts.md packages/billing/README.md packages/billing-ui/README.md
git status --short
```

If `prettier --check` fails, run `npx prettier --write` on those three paths and re-run
the check.

## Step 7 — Report

Write your report to
`plans/2026-09-06-customers-items-contacts-crud/reports/agy/2026-09-06-phase-e-contacts-docs.md`
containing:

- the three files you changed and what you put in each;
- every place the code contradicted this brief;
- the exact output of the two commands from Step 6;
- anything you could not determine from the source.
