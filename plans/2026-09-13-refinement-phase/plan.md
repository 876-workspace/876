# Implementation Plan: Console & ecosystem refinement phase

- Run ID: `2026-09-13-refinement-phase`
- Status: IN_PROGRESS
- Base: `main` @ ae40d40a8

## Objectives (user items, 2026-09-13)

| # | Item | Owner | PR |
| - | ---- | ----- | -- |
| 1 | Record-card / route tabs: visible active accent (blue, never green) | orchestrator | PR1 |
| 12 | Data tables: hide the idle sort chevrons on load | orchestrator (one component) | PR1 |
| 2 | Console user contacts: pick an existing 876 user, not a raw id (orgs unchanged) | orchestrator | PR2 |
| 3 | Remove Contacts tab from Console user record | orchestrator | PR2 |
| 4 | Remove Notes tab from Console user record | orchestrator | PR2 |
| 6 | User edit opens in the detail column with a compact "Edit <name>" header | orchestrator | PR2 |
| 8 | Split Security: new Sessions tab (devices, sessions, sign-in activity); account status → bottom of Overview | orchestrator | PR2 |
| 9 | Console organization opens on its own page, not a split view | orchestrator | PR3 |
| 13 | Console customer view: Invoices tab → Transactions, accordion UI only | orchestrator | PR3 |
| 10 | Every collapsed list toolbar keeps its `+ Add` | orchestrator | PR4 |
| 16 | Couriers: CRM service-client setup + env vars (no feature build-out) | opencode muse-spark-1.3 | PR5 |
| 17 | Empty Astro docs app | cline (free, fastest) | PR6 |
| 5 | Rename every "Audit" page/tab to "Activity" | cline (free, fastest) — user redirected from Codex | PR7 |
| — | `cli.md`: Cline CLI free models + invocation | orchestrator | PR8 |
| 11 | All list pages use `StatusFilterHeading` with relevant titles | codex gpt-5.6-terra medium — runs last | PR9 |
| 14 | Standard list-toolbar options (Refresh / Import / Export) everywhere | codex gpt-5.6-terra medium — runs last | PR10 |

## Key decisions

- Orchestrator owns all visual/UI refinement directly (user instruction).
- Codex runs **after** PR1–PR4 merge: items 11 and 14 edit the same list pages
  and toolbars PR2–PR4 touch, so running them concurrently would conflict.
- **No worktrees** (user, 2026-09-13). The first delegates were started in
  worktrees; their output was carried into the main checkout and the worktrees
  removed. Later delegates run in the main tree on disjoint file scopes, and the
  orchestrator splits their changes into PR branches by path.
- User redirected: delegate more; Cline takes easy renames; Codex available.
- Item 13's "customer view" is the Console user record's Invoices tab (the only
  one); the shared `@876/billing-ui` accordions made it part of PR2.
- Backend already restricts user contacts to 876 users (`contact_user_id`
  required, `requireUser`); item 2 is a Console UI change (user search picker).
- Active tab accent is the platform's single blue (`info` / `--876-blue`),
  matching the list `Add` button (app-layout §9).

## Briefs

| Delegate | Brief |
| -------- | ----- |
| opencode muse-spark-1.3 | [couriers CRM setup](./briefs/opencode/2026-09-13-couriers-crm-setup.md) |
| cline | [Astro docs app](./briefs/cline/2026-09-13-docs-astro-app.md) |
| cline | [Audit → Activity rename](./briefs/cline/2026-09-13-audit-to-activity.md) |
| codex terra | [list toolbar standard](./briefs/codex/2026-09-13-list-toolbar-standard.md) |
| codex terra | [org full page](./briefs/codex/2026-09-13-org-full-page.md) |
| cline | [cli.md Cline section](./briefs/cline/2026-09-13-cli-rule-cline.md) |

## Reports

| opencode muse | [couriers CRM setup](./reports/opencode/2026-09-13-couriers-crm-setup.md) |

## Checklist

- [x] #544 ui tabs + sort chevrons (items 1, 12) — merged
- [x] #545 console user record (items 2, 3, 4, 6, 8, 13) — merged
- [x] #546 couriers CRM setup (item 16, opencode muse) — merged
- [x] #547 docs app (item 17, cline) — merged
- [x] #548 audit → activity (item 5, cline) — merged
- [ ] org full page (item 9) — codex terra, running
- [ ] list toolbar standard (items 10, 11, 14) — codex terra, running
- [ ] cli.md Cline section — cline, running
- [ ] Vercel production deploys for every touched app

## Verification

```bash
pnpm --filter @876/ui typecheck && pnpm --filter @876/ui test
pnpm --filter @876/console typecheck && pnpm --filter @876/console lint && pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

## Handoff state

See checklist; worktrees under `/root/projects/876-wt/`.
