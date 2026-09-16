# Brief: write the pull-request description for the invoice lifecycle hardening feature

You are writing **one markdown file**. You are not changing any code.

## The one file you create

Write exactly this path, and nothing else:

```
plans/2026-09-07-invoice-lifecycle-hardening/reports/agy/2026-09-08-pr-description.md
```

## Files you must read first (read all of them, fully)

1. `plans/2026-09-07-invoice-lifecycle-hardening/plan.md`
2. `plans/2026-09-07-invoice-lifecycle-hardening/reports/gpt-web/2026-09-07-invoice-lifecycle-hardening.md`
3. `apps/billing/docs/invoice-lifecycle.md`
4. `apps/billing/docs/accounting-model.md`
5. `.agents/rules/git.md` — specifically the "PR Description Template" and
   "The final `main` PR" sections.

Also run this to see the real commit list, and use it to write the summary:

```
git log --oneline --no-merges origin/main..HEAD
git diff --stat $(git merge-base origin/main HEAD)..HEAD
```

## Files you must NOT touch

Do not modify, create, or delete anything except the single output file named
above. In particular: no source files, no `plan.md`, no other report, no rule
files, no config. Do not run `git add`, `git commit`, `git push`, or any
branch command.

## What the description must contain

This is the final PR from the feature integration branch
`feature/invoice-lifecycle-hardening` into `main`. Per `.agents/rules/git.md`,
it must explain the **whole feature**, not the last commit — treat it as the
document someone reads a year from now to understand why the code is shaped
this way.

Use this exact structure, with these exact headings:

```markdown
## What does this PR do?

<2–4 paragraphs. What the invoice lifecycle looked like before, what problem
this fixes, and what it does now. Name the bounded context: 876 Billing owns
the invoice lifecycle; 876 Billing and 876 Invoice are host surfaces over it.>

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

<Tick the boxes that genuinely apply, using [x]. This branch adds behaviour,
fixes correctness defects, and updates docs — decide from the commit list and
tick accordingly. It does NOT change stored enum values, so it is not breaking.>

## The lifecycle model

<Explain the canonical status projection as a fenced code block, taken from
plan.md's "Canonical collectible projection" section, then a short paragraph
per invariant that a reviewer needs in order to read the diff. Cover: draft
invoices have no AR impact; finalization is the posting boundary; callers
cannot set PAID directly; sentAt is communication evidence and SENT is a
compatibility projection; overdue beats partially-paid while a positive
balance remains past the due date; PAID means zero remaining receivable
through cash and/or credits; VOID and UNCOLLECTIBLE remove an invoice from
open AR without deleting history.>

## Changes made

<Group by area, with a short bullet list under each. Use these groups, in
this order, and only include a group if the diff actually touches it:
- **Billing API — lifecycle core** (the new `invoice-lifecycle.ts` owner and
  everything that now reuses it)
- **Billing API — lifecycle commands** (send, void, write-off)
- **Billing API — settlement consistency** (payment and credit-note
  allocation, automatic credit settlement, overdue materialization)
- **Billing SDK** (`packages/billing` — tenant and integration surfaces)
- **Shared UI** (`packages/billing-ui` — the shared lifecycle actions)
- **Host apps** (`apps/billing`, `apps/invoice` — thin adapters and browser
  clients)
- **Documentation**
Each bullet says what changed and why, not just a file name.>

## Design decisions

<Pull these from plan.md's "Key design decisions" and explain each in two to
four sentences: one lifecycle owner; the deliberate Customers-AR boundary
exception and why importing Documents there would be a module cycle; no enum
migration; commands rather than status setters; first-sent-timestamp
semantics; the conservative Void presentation and why status alone cannot
prove an overdue invoice is safe to void; and why the invoice timeline was
deliberately deferred rather than fabricated from outbox events.>

## Testing

- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Manual testing completed

<Then a short paragraph. State the number of new test declarations and where
they live, from plan.md's "Test drafting summary". Then state plainly that
the implementation was authored without execution and that verification was
performed separately by the orchestrator — leave a clearly marked
placeholder line reading exactly:

  <!-- ORCHESTRATOR: replace with the real verification results -->

Do NOT claim any command passed. You have not run one.>

## Compatibility

<State that the durable `InvoiceStatus` values (DRAFT, OPEN, SENT,
PARTIALLY_PAID, OVERDUE, PAID, UNCOLLECTIBLE, VOID) are unchanged, that no
database migration is required, and that the new SDK/API surface is additive.>
```

## Rules for how you write

- **Do not invent anything.** Every claim must be traceable to the files you
  read or the commit list. If something is not in those sources, leave it out.
- **Never write that a test, typecheck, lint, or build passed.** You have not
  run any of them, and neither had the agent that wrote the code.
- Plain declarative prose. No marketing tone, no emoji, no "This PR
  revolutionises…". Short sentences.
- No AI attribution anywhere — no "Generated with", no co-author trailer.
- Do not add a "Related Issues" section; there is no issue number.
- Wrap prose at roughly 80 columns.
- The output file contains **only** the PR description markdown, starting at
  `## What does this PR do?`. No preamble, no "here is the description", no
  explanation of what you did.

When you are finished, confirm in one line that you wrote the single file and
touched nothing else.
