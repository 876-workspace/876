# Task: rewrite ONE file — `packages/billing-ui/README.md`

You are editing exactly one file in the repository at `/root/projects/876`:

```
packages/billing-ui/README.md
```

Do NOT create, edit, delete, move, or read-and-modify any other file.
Do NOT run git. Do NOT commit. Do NOT create a branch.
Two other agents are editing `apps/billing/` and `apps/invoice/` right now —
touching anything outside the one file above will corrupt their work.

## Why

The README is out of date. It claims the package exports only
`@876/billing-ui/items-table`. It actually exports 16 subpaths, including a
whole panel layer and a shared document line-item editor added since.

Your job: rewrite the README so it describes the real surface.

## Step 1 — read these files (read only, do not modify)

1. `packages/billing-ui/README.md` — the current text
2. `packages/billing-ui/package.json` — the authoritative `exports` map
3. `packages/billing-ui/src/document/document-line-items-editor.tsx` — read the
   exported TypeScript interfaces `DocumentLineItemsEditorProps`,
   `DocumentLineDraft`, `DocumentItemOption`, `DocumentLineColumn`, and
   `DocumentTotalsSnapshot`, plus their doc comments
4. `packages/billing-ui/src/panels/panel.ts` — the panel contract types
5. `.claude/rules/finance-app-parity.md` — the rule this package implements

## Step 2 — the exact export list

These are the 16 subpaths in `package.json`. Reproduce them exactly, spelled
this way, in this order:

```
./bank-accounts-grid
./customers-list
./customers-table
./document-status
./document/document-line-items-editor
./invoices-table
./items-table
./panels/customer-billing-facts-panel
./panels/customer-contact-panel
./panels/customer-organization-panel
./panels/customer-receivables-panel
./panels/customer-statement-panel
./panels/customer-timeline-panel
./panels/customer-transactions-panel
./panels/panel
./payments-table
```

## Step 3 — write the new README with exactly these sections, in this order

1. `# @876/billing-ui` — keep the existing two intro paragraphs verbatim.

2. `## Import Pattern` — keep the existing code fence and the sentence about
   importing from subpaths, but REPLACE the claim that the package "exports
   `@876/billing-ui/items-table` today" with the full list from Step 2,
   rendered as a markdown bullet list of the 16 subpaths.

3. `## Panels` — a new section. Explain, in your own prose drawn from
   `finance-app-parity.md`:
   - a **panel** is the unit of shared finance UI; the word is fixed (not
     widget, not card, not section, not block);
   - a panel renders and does not fetch — it takes resolved plain data, a
     discriminated `state` prop, and href builders from the host;
   - a panel never hard-codes an href, because Console mounts the same panel
     under a different URL prefix;
   - divergence between Billing and Invoice is a prop or a named slot, never a
     forked copy.
   Then list the seven `panels/*` subpaths from Step 2 with a one-line
   description each, inferred from the component file names.

4. `## DocumentLineItemsEditor` — a new section. Open with one sentence saying
   it is the one shared document line editor, and that it computes totals
   through `@876/core/money` so a running total in the browser cannot disagree
   with the document the service writes.

   Then a props table with these exact columns:
   `| Prop | Type | Description |`
   Fill it from the real `DocumentLineItemsEditorProps` interface you read in
   Step 1. Include every prop. Take the descriptions from the doc comments in
   the file — do not invent behaviour.

   Then a short `### Line drafts` subsection describing `DocumentLineDraft`,
   and stating these two facts, which are in the file's comments:
   - a draft row holds the raw typed strings, so a half-finished entry survives
     a re-render instead of snapping to a parsed value mid-keystroke;
   - a percentage discount resolves through basis points against the line's own
     subtotal, matching the arithmetic the submitted document uses.

5. `## Adding a Surface` — keep verbatim.
6. `## Transpilation` — keep verbatim.
7. `## Commands` — keep verbatim.

## Step 4 — rules for the writing

- Do not add a wordy explanatory paragraph under a heading that merely restates
  what the table below it already shows. The repo forbids this
  (`CLAUDE.md` → UI Copy).
- Prose is plain and factual. No marketing tone. No emoji.
- Every claim must come from a file you read in Step 1. If you cannot find a
  prop's meaning in the source, write a short factual description of its type
  rather than guessing at behaviour.
- Use `-` for bullets and fenced code blocks with a language tag.
- Do not exceed roughly 160 lines.

## Step 5 — verify before you report

Run exactly this, and include its output in your report:

```
wc -l packages/billing-ui/README.md
git -C /root/projects/876 status --short -- packages/billing-ui
```

That command is deliberately scoped to `packages/billing-ui`. Other agents are
changing files under `apps/` at the same time, so a repo-wide `git status` will
list files that are not yours — that is expected and is not a problem.

Within `packages/billing-ui`, the ONLY path you may have modified is
`README.md`. If the scoped output lists anything else under
`packages/billing-ui`, say so loudly in your report.

## Report

State: the new line count, the 16 subpaths you listed, the number of props in
the editor table, and anything in Step 1 you could not find.
