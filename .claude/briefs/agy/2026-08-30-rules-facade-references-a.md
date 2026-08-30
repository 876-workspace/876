# Brief — update passing `$876` facade references in the rule files

You are updating documentation only. Do not change any code, and do not run any
build, test, lint, or git command.

## Background

876 has replaced its repository-wide `$876` mega-facade with **bounded service
clients**, one per owning domain. The decision is recorded in
`docs/architecture/020-bounded-service-clients-and-application-bffs.md`. Read
that file first — it is short, and it is the source of truth for everything
below.

The short version:

| Old                                                                                               | New                                                                                                |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `$876.<anything>` for every domain                                                                | `$876` means the **876 Account** only (auth, current user, sessions, OAuth grants, mobile numbers) |
| `$876.organizations`, `$876.memberships`, `$876.departments`, provisioning, modules, entitlements | `workspace.<resource>`                                                                             |
| `$876.users` (cross-org admin), app registry, API keys, devices, auth attempts, sessions admin    | `platform.<resource>`                                                                              |
| `$876.requests`, `$876.customerProfiles`                                                          | `crm.<resource>`                                                                                   |
| `$876.tasks`, `$876.calendars`                                                                    | `work.<resource>`                                                                                  |
| `$876.invoices`, `$876.customers`, `$876.paymentMethods`                                          | `billing.<resource>`                                                                               |
| `$876.packages`                                                                                   | `couriers.<resource>`                                                                              |
| `$876.files`, `$876.uploads`                                                                      | `storage.<resource>`                                                                               |
| `$876.notes`, `$876.collections`                                                                  | `widgets.<resource>`                                                                               |
| `@876/sdk`                                                                                        | `@876/account`                                                                                     |
| `@876/admin`                                                                                      | `@876/platform`                                                                                    |
| `@876/client`                                                                                     | deleted; each host composes only the clients it needs                                              |

Clients are imported from a **caller-authority entrypoint**: `session`,
`service`, `operator`, or `integration` — e.g. `@876/crm/operator`,
`@876/workspace/session`, `@876/platform/operator`.

## Scope — exactly these six files

Each mention count is what a search for `$876`, `@876/sdk`, `@876/admin`, or
`@876/client` returns today. They are **passing references inside examples and
prose**, not the architectural core of the file.

| #   | File                                     | Mentions |
| --- | ---------------------------------------- | -------- |
| 1   | `.claude/rules/app-access.md`            | 2        |
| 2   | `.claude/rules/app-layout.md`            | 3        |
| 3   | `.claude/rules/app-structure.md`         | 1        |
| 4   | `.claude/rules/billing-data-plane.md`    | 1        |
| 5   | `.claude/rules/customer-architecture.md` | 2        |
| 6   | `.claude/rules/data-loading.md`          | 3        |

**Do not touch any other rule file.** In particular, leave
`sdk-conventions.md`, `access-tiers.md`, `api-access.md`,
`workspace-control-plane.md`, `data-fetching.md`, `platform-services.md`, and
the root `CLAUDE.md` completely alone — those are being rewritten separately and
an edit from you would collide.

**A second agent is editing `feature-flags.md`, `shared-product-ui.md`, `storage-architecture.md`, `new-app-guide.md` at the same time. Do not open, read-modify, or write any of those files.**

## Mirroring — do both trees

`.claude/rules/` is the canonical copy. Every file also exists at
`.agents/rules/<same-name>`. **Apply the identical edit to both**, so the two
trees stay byte-identical for these ten files. That is 12 file edits in total.
(`.grok/rules/` no longer exists — do not create it.)

## Worked example

In `.claude/rules/data-loading.md` the current text reads:

```tsx
async function CustomersTableData({ searchParams }: Props) {
  const params = await searchParams
  const result = await $876.customers.admin.list({ limit: 25 })
  return <CustomersTable data={result.data?.data ?? []} />
}
```

`customers` in a Console/billing context is owned by **Billing**, and Console
calls it at operator authority, so the corrected text is:

```tsx
async function CustomersTableData({ searchParams }: Props) {
  const params = await searchParams
  const result = await billing.customers.list({ limit: 25 })
  return <CustomersTable data={result.data?.data ?? []} />
}
```

Note three things about that edit, and apply all three every time:

1. the domain prefix replaces `$876`;
2. the `.admin` tier segment disappears — authority now lives in the **import**,
   not in the call chain;
3. **nothing else in the snippet changes.** Do not reformat, re-indent,
   re-word, or "improve" surrounding text.

## Rules for your edits

- Change **only** the lines containing a facade reference, plus an import line
  directly above it if one needs to change with it.
- Do not add, delete, or reorder sections, headings, table rows, or list items.
- Do not reflow paragraphs or change line wrapping anywhere.
- If a mention is genuinely still correct under the new model — an account-level
  call such as `$876.auth.login(...)` or `$876.users.me.retrieve()` — **leave it
  exactly as it is**. `$876` still means the Account client.
- If you cannot confidently determine the owning domain for a mention, **leave
  that mention unchanged** and list it in your report. A wrong domain is worse
  than a stale example.

## Report

When you are finished, write `.claude/reports/agy/2026-08-30-rules-facade-references-a.md`
containing:

- a table with one row per file: the file path, how many mentions you changed,
  and how many you deliberately left unchanged;
- for every mention you changed, the old text and the new text;
- for every mention you left unchanged, the text and the reason;
- confirmation that `.claude/rules/<file>` and `.agents/rules/<file>` are
  identical for all six files.

_(Orchestrator note, not an instruction to you: this brief is run via `agy` on a
Gemini model. Do not shell out to `agy` yourself.)_
