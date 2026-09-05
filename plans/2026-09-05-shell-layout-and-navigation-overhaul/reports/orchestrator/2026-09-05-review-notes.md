# Orchestrator review notes — carry these into the acceptance pass

Written while the Phase 1/2/8 delegates were still running. Each is a thing to
check **before** accepting the delegate's work, not a finished judgement.

## Phase 8 — `packages/core/src/access/app-assignment-role.ts`

Read at an intermediate state. The resolver itself is correct: it filters deleted
roles, honours a requested role only when that id is present in the live list
(so a caller cannot inject an arbitrary role id), maps the subject's own
organization role, then falls back to the app default and finally to no role. It
never substitutes a broader role. Fails closed.

**Note 1 — blanket underscore replacement.** `mappedRoleKey` normalizes with
`organizationRole.replaceAll('_', '-')`. `.claude/rules/naming.md` is explicit:
*"Never mass-replace `_` with `-`. Durable values use an explicit, reviewed
old→new migration map."* This is a comparison rather than a persisted write, and
with only two matched keys it is safe in practice — but an explicit map is
strictly better and rule-compliant:

```ts
const ORG_ROLE_TO_APP_ROLE: Record<string, string> = {
  super_admin: 'super-admin',
  admin: 'admin',
}
```

Ask for this change unless the delegate gives a reason not to.

**Note 2 — the elevation guard must be proven, not assumed.**
`requireSuperAdminForElevation`
(`apps/api/src/modules/app-access/app-access.service.ts:266`) rejects a
non-super-admin caller who *asks* for the super-admin app role. The new mapping
produces that same role automatically with `source: 'organization-role'`.

That is defensible — the role is derived from the **subject's** organization
role, not from what the caller requested, so it grants nothing the subject was
not already entitled to. But it must be covered by an explicit test, not left to
reasoning. Confirm the brief's case is present: *a non-super-admin caller
explicitly requesting the super-admin app role is still rejected*, alongside *an
org super_admin provisioned automatically does receive it*.

## Phase 2 — `packages/ui/src/components/list-detail-shell.tsx`

The shell now reclaims half the page gutter with a negative margin:

```tsx
'@container/list-detail -ml-[var(--876-shell-gutter)] h-full min-h-0'
```

with the comment *"A Page supplies the outer page gutter. Reclaim its left half
here so the list begins one shell gutter from a floating sidebar, not two."*

This works but is fragile: the shell now depends on always being rendered inside
a `Page` that applied exactly that gutter. `ListDetailSection` does that today,
but `ListDetailShell` is exported separately and Console's organization workspace
renders it under a different height wrapper (`.claude/rules/app-layout.md` §5a).
A caller that renders the shell **without** a `Page` gets a negative margin
pulling it under the sidebar.

Prefer having `Page` not apply the gutter on the side the shell owns, or a
variant prop, over a negative margin that silently assumes its parent. Raise it
with the delegate; do not accept it without an answer.

## Phase 1 — verify the fix actually works, do not trust the report

The brief requires the delegate to grep the built CSS:

```bash
pnpm --filter @876/projects build
grep -r "grid-cols-3" apps/projects/.next/static/css/ | head
```

Run this yourself. A green `check:transpile` proves the check script passes, not
that the class is compiled. If the grep is empty the fix did not work regardless
of what the report says.

## Cross-cutting, all delegates

Per `.claude/rules/cli.md`, before accepting any run:

```bash
grep -rn "eslint-disable\|as any" <paths it touched>
```

and confirm the test **count** moved rather than the suite merely being green.
Codex has previously satisfied a lint gate by disabling the rule, and has
reported success having written none of the tests its brief required.

---

## CRITICAL — `--876-shell-gutter` resolves to nothing (found 2026-09-05, orchestrator)

`packages/ui/src/876.css` defines the token as:

```css
--876-shell-gutter: var(--spacing-4);   /* and --spacing-6, --spacing-8 */
```

**`--spacing-4` does not exist.** Tailwind v4 defines a single `--spacing:
0.25rem` (`node_modules/tailwindcss/theme.css:325`) and computes each step, which
is visible in the emitted CSS:

```css
.px-4{padding-inline:calc(var(--spacing) * 4)}
```

Grepping every stylesheet in `packages/ui/src`, every app `globals.css`, and
Tailwind's own theme finds **no definition of `--spacing-4`**. The broken value
is already in the built output:

```
--876-shell-gutter:var(--spacing-4)
```

An unresolved `var()` in a shorthand makes the whole declaration invalid, so
`padding-inline: var(--876-shell-gutter)` is **dropped**. Every consumer —
`Page`, the sidebar insets, the `ListDetailShell` column gap, the shared
floating sidebar's padding, and the negative-margin reclaim — collapses to
zero. The layout would render flush against the window edges.

### Fix

```css
--876-shell-gutter: calc(var(--spacing) * 4);   /* 1rem   */
--876-shell-gutter: calc(var(--spacing) * 6);   /* 1.5rem */
--876-shell-gutter: calc(var(--spacing) * 8);   /* 2rem   */
```

Literal `1rem` / `1.5rem` / `2rem` is equally acceptable and arguably clearer,
but the `calc()` form keeps the token tied to Tailwind's spacing base so a theme
change moves both together.

### Why the delegate will not fix it

The Phase 2b follow-up brief states *"Keep `--876-shell-gutter` and its 4/6/8
values; they are correct."* That instruction was the orchestrator's error. Phase
2b will preserve the broken values, so **the orchestrator must apply this fix
after Phase 2b exits.**

### Why no test caught it

Every assertion added in Phase 2 compares Tailwind **class strings**
(`px-[var(--876-shell-gutter)]`), which are identical whether or not the token
resolves. A test at that level cannot fail on this. The regression test must
assert the **resolved** value — read the custom property's computed value, or
assert the token's declaration in `876.css` references a defined variable.
