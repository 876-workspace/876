# Task: group Console permissions by product, then module — on both surfaces

Repo `/root/projects/876`, branch `feat/shell-layout-navigation-overhaul`.
**Do not create/switch branches. Do not commit. Do not open a PR.**

## The two pages

1. `https://876-console.vercel.app/settings/users/<id>/permissions` — read-only,
   rendered by
   `apps/console/src/app/(app)/settings/users/(team)/[id]/_components/access-panel.tsx`.
2. `https://876-console.vercel.app/settings/users/roles/super-admin` — the role
   editor, rendered by
   `apps/console/src/app/(app)/settings/users/roles/_components/permission-editor.tsx`
   and `permission-group-picker.tsx`.

## What the user said

On the read-only page:

> "I really like how the permissions are being rendered here. The only thing is
> I'm seeing Billing Catalog as an accordion dropdown by itself with its own
> permissions, and then Billing Sales is another accordion item. Yes, all of
> these are billing, but they're not — I want them to be separated out and
> grouped properly… collapse them in a really nice UI in a fashion that makes
> sense, not just arbitrarily collapsing."

On the role page:

> "Update the permissions UI here too — maybe the overall card in a similar
> fashion to match the design, as it's ugly here."

## Verified cause

`apps/console/src/lib/permissions.ts` builds a **flat** `PermissionGroup[]`:

```ts
const PRODUCT_GROUPS: PermissionGroup[] = operatorProductCatalogs().flatMap(
  (catalog) =>
    groupByModule(catalog, []).map((group) => ({
      label: `${productLabel(catalog.app)} · ${group.label}`,   // "876 Billing · Catalog"
      ...
    }))
)

export const PERMISSION_GROUPS: PermissionGroup[] = [
  ...CONSOLE_GROUPS,
  ...PRODUCT_GROUPS,
  ...OPERATOR_EXCLUSIVE_GROUPS,
]
```

Every product **module** becomes its own top-level accordion with the product
name flattened into a `"Product · Module"` string. Console administers every
product, so this produces a long undifferentiated list.

## What to build

### 1. A two-level structure

Change `PermissionGroup` to nest: **product/section → module → permissions.**
`876 Billing · Catalog` and `876 Billing · Sales` become two modules inside one
`876 Billing` group. Drop the `·`-joined label string — the nesting carries it.

Keep the three top-level sections that already exist and mean different things:
Console's own permissions, the product catalogs, and the Console-exclusive
operator actions. **Operator actions stay visibly separate** — do not fold
"Purge CRM records" into the CRM product group. Read the comment above
`OPERATOR_EXCLUSIVE_GROUPS` explaining why before you touch it.

### 2. Render it on both surfaces, identically

The user likes the current module treatment on the read-only page: the icon tile
from `MODULE_STYLE`, the module name, and the granted/total count. **Keep it**,
and apply it to modules nested inside a collapsed product group.

- Add a granted/total roll-up on the **product** row too, so a collapsed product
  still says how much of it is held.
- Preserve `MODULE_STYLE`'s colour identity and the comment explaining why
  emerald is deliberately absent from it.
- The role editor (`permission-group-picker.tsx`) gets the same structure and the
  same visual language, plus its checkboxes and a product-level select-all /
  clear that reflects an indeterminate state when only some modules are held.
- The user called the role page "ugly": bring it up to the read-only page's card
  treatment, not the other way round.

### 3. Light and dark

Both surfaces must be checked in **both** themes. `MODULE_STYLE` already carries
`dark:` variants; anything new must too.

## Constraints

- `MODULE_STYLE` keys are module keys. After nesting, make sure a module's style
  still resolves — several products share module names (`customers`, `payments`,
  `reports`), so a flat key lookup may now collide across products. Handle it
  explicitly and say how in your report.
- Permission **keys are durable identifiers** (`.claude/rules/naming.md`). This
  is a presentation change: do not rename, add, or remove a single permission
  key, and do not change what any role grants.
- Do not change the save path in `permission-editor.tsx` beyond what the new
  structure requires — it must still submit a flat `string[]`.
- No prose paragraph under a heading (root `CLAUDE.md` → UI Copy).
- No `eslint-disable`, `@ts-ignore`, `as any`.
- Do not touch shell files (`components/shell/**`) or `packages/ui` layout
  primitives — other agents own those concurrently.
- Do not commit.

## Tests

Minimum 18 new `it()` cases: the grouping function nests modules under the right
product; a module name shared by two products resolves to the right style and
does not collide; the granted/total roll-up is correct at module and product
level, including 0-of-n and n-of-n; operator-exclusive actions stay in their own
section; the editor still submits a flat key array unchanged by regrouping;
select-all and clear at product level; indeterminate state; and a snapshot of the
full set of permission **keys** proving none were added or lost.

That last one matters most — it is the assertion that catches a presentation
refactor quietly changing what a role can do.

## Verify (foreground, read the output)

```bash
pnpm --filter @876/console typecheck && pnpm --filter @876/console lint && pnpm --filter @876/console test
pnpm --filter @876/core typecheck && pnpm --filter @876/core test
node scripts/check-app-structure.mjs
```

## Report

Write to
`plans/2026-09-05-shell-layout-and-navigation-overhaul/reports/codex/2026-09-05-permissions-grouping.md`:
the new type shape; how you resolved module-key collisions across products; files
changed; the **counted** number of `it()` cases added; verification output; proof
that the permission key set is unchanged; and anything you could not verify.

---

## Concurrency note (added at dispatch)

Another agent is editing `apps/console/src/components/shell/sidebar.tsx` and
`apps/console/src/components/shell/sidebar.test.tsx` at the same time as you, and
a third is editing `apps/api` and `packages/core/src/access/**`.

- **Do not edit any file under `apps/console/src/components/shell/`.**
- **Do not edit `packages/ui/**` or `apps/api/**`.**
- When you run the Console suite you may see failures in `sidebar.test.tsx` or
  shell-related snapshots that are **not caused by your change**. Do not fix
  them and do not work around them. Report them separately under a
  "failures not mine" heading, and judge your own work by the
  `settings/users/**` and `lib/permissions` tests.
- Before your final verification run, re-read `apps/console/src/lib/permissions.ts`
  from disk in case it moved under you.
