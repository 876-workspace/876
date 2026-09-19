# Build the `any` budget gate

## The requirement

The user, 2026-09-19: **"`any` should never be used in any case, must always be
typesafe."**

Measured on `main` today, excluding tests and `node_modules`:

| Workspace | `any` occurrences |
| --- | --- |
| `apps/billing-api` | 251 |
| `apps/api` | 199 |
| `apps/projects-api` | 149 |
| `apps/work-api` | 53 |
| `apps/couriers-api` | 49 |
| `apps/crm-api` | 45 |
| `apps/communications-api` | 29 |
| `apps/console` | 27 |
| `apps/widgets-api` | 25 |
| **total** | **857** |

Turning `@typescript-eslint/no-explicit-any` to `error` today would fail every
lint run, so nobody could ship anything and the rule would be reverted within a
day. Instead: a **budget that can only fall**, exactly like the `src/lib/`
ratchet added in PR #623.

## What to build

### 1. `scripts/check-any-budget.mjs`

Counts `any` in non-test source per workspace and compares against a committed
baseline. Fails when a workspace exceeds its budget.

- Scan `apps/*/src` and `packages/*/src`.
- **Exclude** `*.test.ts`, `*.test.tsx`, `*.spec.*`, `__tests__/`,
  `node_modules`, `dist/`, `.next/`, and generated Prisma clients.
- Count occurrences of `any` **as a type**, not the substring. Match at least:
  `: any`, `: any[]`, `<any>`, `as any`, `Array<any>`, `Record<string, any>`,
  `Promise<any>`, `any)`, `any>`, `any,`, `any;`. Do **not** match `anyOf`,
  `company`, `Anything`, a string literal, or a comment — strip line comments,
  block comments, and string literals before counting. Getting this wrong in
  either direction makes the gate useless, so **write the counter first and
  test it against fixtures**.
- Read `scripts/any-budget.json`: `{ "<workspace>": <max allowed> }`.
- A workspace **absent** from the file has a budget of **0**. That is the
  default for every new workspace.
- Report per workspace: current, budget, and delta. Exit 1 listing every
  workspace over budget, with the file:line of each occurrence beyond budget
  where practical.
- `--update` regenerates the baseline, but **only downward**: it must refuse to
  raise any workspace's number and say so. Raising a budget requires a human
  editing the JSON, which is the review moment.

### 2. `scripts/any-budget.json`

Generate it from the current tree. The numbers above are a guide, not a
specification — your counter is authoritative, so the committed baseline must
be what your counter actually reports.

### 3. Tests

`scripts/check-any-budget.test.mjs` (or the repo's script-test convention if one
exists — check before inventing one), minimum **12** `it()` cases, counted:

- counts `: any`, `as any`, `<any>`, `Record<string, any>`, `Promise<any>`;
- does **not** count `anyOf`, `company`, `Anything`;
- does **not** count `any` inside a `//` comment, a `/* */` block, or a string
  literal;
- skips `*.test.ts` and `__tests__/`;
- a workspace absent from the budget file is treated as budget 0;
- passes when current equals budget;
- fails when current exceeds budget by one;
- `--update` lowers a budget that has fallen;
- `--update` refuses to raise a budget that has grown.

Follow `.agents/rules/testing.md`: exact values, exact call counts, both sides
of every result. A gate that cannot fail is not a gate — prove yours fails.

### 4. Wire it up

- Add `"check:any": "node scripts/check-any-budget.mjs"` to the root
  `package.json`.
- For any workspace whose count is **already 0**, add
  `'@typescript-eslint/no-explicit-any': 'error'` to its `eslint.config.mjs`.
  Follow the existing shared-config pattern — the root has
  `eslint.app-structure.mjs` and `eslint.ignores.mjs`, which app configs import.
  If more than two workspaces qualify, add `eslint.typesafety.mjs` beside those
  and import it, rather than repeating the rule.
- Do **not** enable the ESLint rule for a workspace with a non-zero budget.

## Hard prohibitions

- Do **not** add a single `eslint-disable`, `@ts-ignore`, `@ts-expect-error`,
  `as any`, or `as unknown as` — including in the scripts you write. This gate
  cannot violate its own rule.
- Do **not** change any application source to lower a count. This task builds
  the gate and records the truth; burning the numbers down is separate work.
- Do **not** raise any budget above what the tree actually contains.
- Do **not** edit `plans/` or the rule files.
- Do **not** `git commit`, branch, or open a PR.

## Verify

```
node scripts/check-any-budget.mjs          # must PASS on the committed baseline
node --test scripts/check-any-budget.test.mjs   # or the repo's runner
```

Then prove it fails: add `const x: any = 1` to any non-test source file, re-run,
confirm it exits 1 and names that workspace, then **remove the line**. Paste
both runs into your report.

## Report

`plans/sep/19-typesafety-and-dedup-residue/reports/opencode/2026-09-19-any-budget.md`
— the counter's matching rules, the committed baseline table, the counted
`it()` total, the pass run, the deliberate-failure run, which workspaces got the
ESLint rule enabled, and anything you could not verify.
