# Brief — cross-app verification sweep for `feature/billing-accounting-providers-zoho`

Model: gpt-5.6-terra, reasoning effort high. Run from repo root `/root/projects/876`.

## Context

Branch `feature/billing-accounting-providers-zoho` (204 commits) carries two entangled
workstreams, both authored by a GitHub-connector agent that **could not execute anything**:

1. the platform naming contract migration (kebab-case feature flags, canonical role
   names `super-admin`/`admin`/`staff`, canonical module/permission keys), and
2. a new Billing accounting-provider integration layer with Zoho Books as first provider.

Because the author never ran a command, every green check is unverified. The orchestrator
is already fixing `apps/billing-api`, `apps/billing`, and `packages/billing`. **Your job is
every OTHER workspace.**

## Scope — you own these workspaces, and only these

- `apps/api`
- `apps/console`
- `apps/couriers` and `apps/couriers-api`
- `apps/crm` and `apps/crm-api`
- `apps/invoice`
- `apps/enterprise`
- `apps/876`
- `apps/widgets-api`
- `packages/*` **except** `packages/billing`

## Files you must NOT touch (the orchestrator is editing them concurrently)

- `apps/billing-api/**`
- `apps/billing/**`
- `packages/billing/**`
- `docs/handoff/**`
- `.claude/**`
- any `git` state: do not commit, branch, rebase, stash, push, or amend. Leave every
  change in the working tree.

`packages/core` is shared. You MAY fix it, but only for a failure you can attribute to a
non-billing workspace, and note any edit prominently in your report.

## Task

For each workspace in scope, run its own scripts and fix what genuinely fails:

```bash
pnpm --filter <workspace> typecheck
pnpm --filter <workspace> lint
pnpm --filter <workspace> test
pnpm --filter <workspace> boundaries   # only where the script exists
```

Run them in the FOREGROUND with a generous timeout. Never background a verification
command, and never report a pass you did not personally see in output.

Also run, from the repo root:

```bash
node scripts/check-app-structure.mjs
```

## Rules that are not negotiable

1. **Do not add `eslint-disable` comments.** A gate satisfied by suppression is a gate
   defeated. Same for `@ts-ignore` / `@ts-expect-error`.
2. **Do not use `as any`.** Use `as unknown as T` only for a deliberate type violation in
   a test.
3. **Do not weaken production code to make a test pass.** Do not loosen a signature, make
   a required prop optional, or delete a rendered component so a test renders more easily.
   If a test and the production code disagree, work out which is right and say so.
4. **Do not weaken a test to make it pass.** Anti-drift/registry/catalog tests exist to
   catch exactly the class of omission this branch risks. If such a test fails because a
   new item was not registered, register the item — do not relax the assertion. Only
   change an assertion when the contract it encodes genuinely changed, and explain why.
5. **Prefer fixing the cause over the symptom.** Several failures will be one missing
   registration.
6. A pre-existing failure that also fails on `origin/main` is **out of scope**: record it,
   do not fix it. Verify by comparing the relevant files against `origin/main` (e.g.
   `git diff origin/main -- <path>`); do not check out or reset anything.
   One already known: `packages/core` `src/lib/phone.test.ts` >
   "includes flag and name for every country" expects 32 dial codes and receives 41. Its
   inputs are byte-identical to main. Leave it failing and do not touch it.

## Known-likely failure shapes on this branch

- role value drift: `super_admin` vs canonical `super-admin`, and legacy `owner`/`agent`/
  `viewer` reads that should now be `admin`/`staff`;
- feature-flag slug drift: `console_widgets` style underscores vs canonical
  `console-widgets`;
- permission/module key drift: `danger_zone` vs `danger-zone`, `my_work` vs `my-work`;
- catalog/navigation binding tests where a declared permission is granted by no role;
- shared `@876/ui` `Button` has **no** `asChild` prop (it wraps Base UI, not Radix). The
  platform pattern is `className={buttonVariants({ variant, size })}` on the `<Link>`
  itself. If you find `<Button asChild>` anywhere in scope, convert it.

## Expected return

Write your report to `.claude/reports/codex/2026-09-01-accounting-cross-app-verification.md`
and also summarize it on stdout. It must contain:

- a per-workspace table: workspace | typecheck | lint | test | boundaries, each PASS/FAIL,
  with the **counted** number of failing tests before and after your work;
- every file you changed and one line on why;
- every failure you judged pre-existing on main, with the evidence for that judgement;
- anything you could not fix, and what blocks it;
- explicitly: any place you were tempted to suppress a rule and what you did instead.

A truthful "not fixed, here is why" is worth more than a confident claim. Do not report a
command as passing unless you saw it pass.
