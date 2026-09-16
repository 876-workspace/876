# Brief: fix the failing invoice-app finance settings test, then sweep for other unrun tests

Branch `feature/billing-commercial-platform-architecture`, already checked out.
Do NOT commit. Do NOT create/switch/merge/rebase branches. Do NOT open a PR.

Your two previous passes are verified green. One more failure surfaced when I widened
verification to the consuming apps — it was never in your earlier briefs.

## The failure

```
pnpm --filter @876/invoice-app test
 Test Files  1 failed | 50 passed (51)
      Tests  1 failed | 382 passed (383)

FAIL src/app/(app)/settings/finance/_components/finance-settings.test.tsx
  > CurrenciesPanel > renders currencies list and add action when canManage is true
TestingLibraryElementError: Unable to find an element with the text: USD.
```

This file does **not** exist on `main`; it arrived with `454ab0164 feat(invoice): condense
finance settings onto one tabbed page`, which is part of this branch's diff. So this PR owns it.

## Root cause (already diagnosed — confirm, don't re-derive)

The shared currency panel in `@876/billing-ui` renders the code and the name in a **single**
paragraph:

```html
<p class="font-medium">
  USD
   ·
  US Dollar
</p>
```

The test asserts `screen.getByText('USD')`, which matches only a whole text node, so the
combined `USD · US Dollar` node cannot match.

**The component is correct.** The same shared panel is rendered by `@876/billing-app`, whose
858 tests all pass, and `@876/billing-ui`'s own 380 tests pass. Do **not** change the shared
component, and do **not** split that paragraph, to make this assertion pass — that would be
weakening production code for a test, which the project rules forbid.

## Required change

Fix the **test** so it asserts what the UI actually renders, while still proving real behaviour:

- Match the combined label (for example a function matcher, or asserting on the element that
  carries both the code and the name), rather than deleting or weakening the assertion.
- Keep the test's intent intact: it must still prove the currency row renders and that the add
  action appears when `canManage` is true.
- Apply the same fix to any sibling assertion in that file with the same broken-text problem
  (check the payment-mode and tax panels too — they may pass today only by accident).
- Do not add `as any`, `@ts-ignore`, `eslint-disable`, or `.skip`.

## Then: sweep for other never-executed tests

Neither GPT Web nor your earlier passes ran the consuming apps. Run the **full** suite below and
fix anything else that is red **and attributable to this branch**. If something is red and also
red on `main`, do not fix it — report it instead.

```bash
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test
pnpm --filter @876/invoice-app build

pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
pnpm --filter @876/billing-app build

pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api lint
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing test
pnpm --filter @876/billing-ui test
pnpm --filter @876/storage test
```

These counts must not drop: billing-api 658, billing 313, billing-ui 380, storage 391,
billing-app 858, invoice-app 383 (with the 1 failure now passing). The contract check must stay
at zero differences.

Append a "Follow-up 2" section to
`plans/2026-09-07-billing-commercial-platform-architecture/reports/codex/2026-09-07-verification-repair.md`
recording what you changed and the final counts for every package above. Do not write a run log
anywhere in the repository.
