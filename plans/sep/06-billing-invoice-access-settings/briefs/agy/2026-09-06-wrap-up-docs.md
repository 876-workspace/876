# Docs task — finalize the run plan and write the PR description

You are editing **two Markdown files only**. Write no code. Touch nothing else.

## File 1 — update `plans/2026-09-06-billing-invoice-access-settings/plan.md`

Read it first. Then make exactly these edits:

1. Change `Status: IN_PROGRESS` to `Status: COMPLETED ✅`.
2. In the `## Phases` checklist, tick `P4` and `P6` (`- [ ]` → `- [x]`) and
   append the summaries below to them, in the same voice as the P3 and P5 lines
   already there.
   - **P4 (Invoice)**: settings/roles split view, member finance-role tab,
     invite flow, guarded `/api/roles`, `/api/members`, `/api/invites` route
     handlers, browser clients, and a Roles entry in the settings navigation.
     Delivered by Codex. 300 tests pass.
   - **P6 (integration)**: the duplicated permission helpers were reconciled
     onto `@876/core/access/finance-catalog`; the roles table was restyled to
     match the customers and items tables; two error-handling defects were
     fixed (see "Defects found" below).
3. Under the existing `## Decisions taken during the run` section, add a new
   `## Defects found and fixed` section containing exactly these four items,
   each as a short paragraph with a bolded lead:
   - **A settings table that vanished on an unrelated failure.** Invoice's
     users layout passed `list={null}` when access verification was
     unavailable, and Billing's users loader let a finance-workspace failure
     reject the whole `Promise.all`. Either one removed the users table
     entirely. Both now keep the roster mounted and render the failure as a
     notice beside it, per `.claude/rules/error-handling.md`.
   - **Duplicate sidebar icons.** `ClipboardList` is an alias of
     `ClipboardDocumentListIcon` in `@876/ui`, so Billing's `items`/`sales` and
     Invoice's `items`/`invoices` rail entries rendered the same glyph. Both
     apps' `nav-icons.test.ts` distinctness assertions were already failing on
     this branch before this run started.
   - **A third copy of the finance permission list.** The keys were restated in
     `apps/billing-api`, `apps/billing`, and the tenant provisioning seed. One
     owner now, with drift tests on both remaining literal tuples.
   - **A merged validation message.** A role missing workspace access and a role
     missing an implied read had been collapsed into one error string; they are
     two different mistakes and are reported separately again.
4. Replace the whole `## Handoff state` section with a short paragraph saying
   the work is complete, every suite is green, and listing the follow-ups:
   migrating Billing's enforcement plane onto the platform app-access plane
   (tracked by the TODO in `apps/billing/src/types/permission-values.ts`), and
   the idempotent member-grant route deferred to avoid extending the frozen
   FastAPI parity contract.

Do not restructure the file, do not reformat sections you were not asked to
change, and do not remove anything.

## File 2 — create `plans/2026-09-06-billing-invoice-access-settings/reports/orchestrator/2026-09-06-pr-description.md`

Write a pull-request description using the template in
`.agents/rules/git.md` ("PR Description Template"). Fill it from `plan.md` and
the reports in `plans/2026-09-06-billing-invoice-access-settings/reports/codex/`.

It must cover, in the "Changes made" section:

- `@876/core` gains `access/finance-catalog.ts`: the single owner of the finance
  permission keys, the per-product editing surfaces (Billing full, Invoice
  without subscriptions, banking, purchases, vendors, payment methods and
  currencies), and the partition/merge/implication rules.
- `@876/billing` gains typed `roles` and `members` resources plus typed
  `members.list` / `members.resolve` projections on the server client.
- `@876/billing-ui` gains `panels/access/*`: a shared roles split view, role
  card, role form, permission matrix, members table and invite panel that both
  finance apps render.
- 876 Invoice gains a complete roles and users settings surface it did not have.
- 876 Billing's roles surface moves onto the shared panels; seven app-local
  components are deleted.
- The four defects listed above.

State the verification results as facts: `@876/core` 1072 tests,
`@876/billing` 258, `@876/billing-ui` 241, `@876/billing-api` 587,
`@876/billing-app` 817, `@876/invoice-app` 300, plus
`node scripts/check-app-structure.mjs`. Typecheck and lint pass everywhere;
lint warnings that remain are pre-existing.

Include a short "Design decisions" section stating that 876 Invoice does **not**
get its own database, with the three reasons from `plan.md`, and that the two
authorization planes are deliberately left separate in this change.

Tick the "New feature" box in "Type of change". Leave "Related Issues" empty.
Do **not** add any AI attribution, co-author trailer, or "generated with" line.

## Constraints

- Markdown only. Do not run any command. Do not commit. Do not create a branch.
- Do not invent numbers; every figure you need is in this brief or in `plan.md`.
- British-neutral plain prose, no marketing tone, no emoji beyond the ✅ named above.
