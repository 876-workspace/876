# Brief: make Console's permission picker usable at 241 permissions

You are doing UI-only work in one existing app, Console
(`apps/console/`). Do not touch any backend, any file under
`apps/crm-api`, `packages/crm`, `apps/console/src/lib/operator-permissions.ts`,
`apps/console/src/lib/permissions.ts`, or any `.test.ts`/`.test.tsx` file
outside the two component files named below — those are settled, verified
work from earlier in this same session and are out of scope.

## Context

`apps/console/src/lib/permissions.ts` exports `PERMISSION_GROUPS`: an array
of `{ label, permissions }` groups used to render a permission picker. It
used to have 7 groups and 47 permissions (Console's own vocabulary only). A
change earlier in this branch made it also project every product's own
permission catalog (CRM, Billing, Couriers, Invoice, Projects) plus a
Console-only "purge" action per product, so it is now **65 groups and 241
permissions**.

Two components render `PERMISSION_GROUPS` as a flat list — every group's
header and every permission pill, all always visible, no collapsing:

- `apps/console/src/app/(app)/settings/users/roles/_components/permission-editor.tsx`
  — editing an existing role's permissions (route: `/settings/users/roles/[roleName]`,
  read the file to confirm; this is the "Permissions" card inside it, lines
  ~151-196 as of this brief).
- `apps/console/src/app/(app)/settings/users/roles/new/_components/create-role-form.tsx`
  — creating a new role. Its permission-rendering block (lines ~137-165 as of
  this brief) is near-**identical** JSX to the one in `permission-editor.tsx` —
  same group header markup, same pill button markup, same class names, just a
  different `toggle`/`selected` closure. This is real duplication, not a
  coincidence.

At 65 always-expanded groups this is now a very long, hard-to-scan page. Your
job is two things:

1. **Extract the duplicated group-rendering markup into one shared component**
   both files use, instead of two copies that can drift.
2. **Make each group collapsible**, using the existing `@876/ui/accordion`
   primitive (`Accordion`, `AccordionItem`, `AccordionTrigger`,
   `AccordionContent` — already used elsewhere in this app, e.g.
   `apps/console/src/features/access/components/feature-access-board.tsx` and
   `apps/console/src/components/patterns/detail/detail-accordion.tsx` — read
   one of those for the import/usage pattern before writing your own).

## What NOT to change

- Do not change `PERMISSION_GROUPS`, `apps/console/src/lib/permissions.ts`,
  or the `PermissionGroup` type in `apps/console/src/types/permission.ts`
  (read it, but do not edit it unless the shared component genuinely needs a
  new prop shape — if so, add a prop to the new component, not a new field on
  the data type).
- Do not change how permissions are selected/toggled/saved — `toggle()`,
  `selected` (a `Set<string>`), `handleSave()`, `handleDelete()` in
  `permission-editor.tsx`, and the equivalent state in `create-role-form.tsx`
  stay exactly as they are. Your new shared component takes the current
  `selected` set and an `onToggle(value: string)` callback as props — it does
  not own selection state itself.
- Do not touch `apps/console/src/app/(app)/settings/users/(team)/[id]/_components/access-panel.tsx`.
  It also imports `PERMISSION_GROUPS` but is a **read-only** granted/total
  display with its own per-module color/icon system (`MODULE_STYLE`) — a
  different concern from the two toggleable pickers above. Leave it alone.
- Do not add a search/filter box unless it is trivial to add well — prefer
  finishing the collapsible extraction cleanly over adding scope. If you have
  time left after the required work is done and verified, a simple text
  filter is a reasonable bonus, but only add it as a clearly separate,
  final step, and only if every required item below is already done and
  verified.

## What the shared component should do

Create `apps/console/src/app/(app)/settings/users/roles/_components/permission-group-picker.tsx`
(this path is route-local to `/settings/users/roles`; `create-role-form.tsx`
lives at `/settings/users/roles/new/_components/`, a **descendant** route, so
it is allowed to import from its ancestor's `_components/` per
`.claude/rules/app-structure.md` — do not put the new file anywhere else).

Suggested shape (adjust as needed once you've read both call sites' exact
JSX/classes — match their existing visual style, do not invent a new one):

```tsx
type Props = {
  groups: readonly PermissionGroup[]
  selected: ReadonlySet<string>
  onToggle: (value: string) => void
}

export function PermissionGroupPicker({ groups, selected, onToggle }: Props) {
  // Accordion, one AccordionItem per group. Trigger shows the group label
  // plus a "N/total" count so an operator can see how much of a group is
  // selected without opening it — compute per group:
  //   const checkedCount = group.permissions.filter(p => selected.has(p.value)).length
  // AccordionContent renders the existing pill-button grid, unchanged from
  // the current markup in permission-editor.tsx (copy its button markup
  // exactly, including the checked/unchecked color classes and the small dot
  // indicator — do not restyle the pills themselves, only the
  // group-header/collapse mechanism around them).
}
```

Requirements:

- Every group starts **collapsed** by default. With 65 groups this must not
  render as a wall of open content.
- The accordion trigger is NOT bold — do not use `font-semibold` or
  `font-medium` on the trigger label text. Match the existing group-header
  visual weight already used in `876-eyebrow` (check what that class applies;
  if it already implies a weight, keep it — just don't add an *additional*
  bold class on top of it).
- Multiple groups can be open at once (do not make it single-open-at-a-time —
  an operator comparing two products' permissions needs both open together).
  Check `Accordion`'s props in `packages/ui/src/components/accordion.tsx` /
  its underlying `@base-ui/react/accordion` for how to allow multiple
  simultaneous open items (likely a `type="multiple"` or similar prop on the
  root `Accordion` — read the primitive, don't guess).
- Keep `key={group.label}` (or better, a stable key if one exists on
  `PermissionGroup` — check the type) on each `AccordionItem`.
- Preserve the exact pill button markup, `aria-pressed`, and the
  `focus-visible` ring classes already present — this is an extraction, not a
  redesign of the individual permission toggles.

## Update both call sites

In `permission-editor.tsx`: replace the current inline
`{PERMISSION_GROUPS.map(...)}` block (the `border-border bg-card/60
overflow-hidden rounded-lg border` wrapper and everything inside it) with
`<PermissionGroupPicker groups={PERMISSION_GROUPS} selected={selected}
onToggle={toggle} />` (adjust prop names to match what you actually built).
Keep the surrounding "Permissions" card header (`<h3>`, the `{selected.size}
selected` count) exactly as it is — only the group-rendering body moves into
the shared component.

In `create-role-form.tsx`: same replacement, using that file's own `selected`
state and `toggle` function as the props.

## Verification (run all, report exact output)

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console exec vitest run src/app/'(app)'/settings/users/roles --maxWorkers=1
node scripts/check-app-structure.mjs
npx prettier --write <every file you changed>
```

If either existing route already has a test file for `permission-editor.tsx`
or `create-role-form.tsx` (grep for `permission-editor.test` and
`create-role-form.test` under `apps/console/src/app/(app)/settings/users/roles`
before starting), read it — if it queries for permission pill buttons by role
`button` with `aria-pressed`, your extraction must keep those buttons
reachable by the same queries once they're inside `AccordionContent`
(`@base-ui`'s accordion typically keeps content in the DOM and animates
height/visibility rather than unmounting — confirm this holds, since an
unmounted-when-closed accordion would break any existing test that expects
to find a pill without first opening its group).

Since this is UI work, you cannot run these commands yourself if your
environment does not support them — if so, state plainly in your final
report that verification was not executed and is the orchestrator's
responsibility, per this repo's rule that an unexecuted check must never be
reported as passing.

## Report

End your turn with a short list of every file you created/changed and a
one-line reason for each.
