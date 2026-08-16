# Brief — one shared customer avatar across Couriers, Billing, and Invoice

Repo: `/root/projects/876`. **Do not commit, do not branch, do not push.** Edit
files only.

## Why

876 Couriers shows a monogram avatar beside each customer's name in its
customers table and again in the customer detail header. Billing and Invoice
show a bare name. They should look the same.

Couriers builds that avatar inline, with its own copies of `initialsOf` and an
`avatarColor` hash over six hardcoded Tailwind tints. Copying that into two more
apps would make three copies of the same helper, which
`.claude/rules/app-structure.md` forbids: a component a second app needs is
promoted to `packages/ui`, not duplicated. So extract it once and adopt it in
all three.

## Reference — read these first

- `apps/couriers/src/app/[orgSlug]/customers/_components/customers-table.tsx`
  — `initialsOf` (~line 28), `AVATAR_COLORS` (~40), `avatarColor` (~49), and the
  name cell that renders `Avatar` + `AvatarFallback` (~62-77).
- `apps/couriers/src/app/[orgSlug]/customers/[id]/(detail)/layout.tsx` (~line 91)
  — the large detail-header avatar.
- `packages/ui/src/components/avatar.tsx` — the `Avatar` / `AvatarFallback`
  primitives, including their `size` prop (`'sm' | 'default' | 'lg'`).
- `packages/ui/src/components/org-avatar.tsx` — an existing shared avatar. Read
  it for house style (deterministic hash, size map, JSDoc tone). **Do not reuse
  or modify it** — that one is an organization logo and takes an image `src`;
  this one is a person/customer monogram built on `Avatar`/`AvatarFallback`.

## 1. Create `packages/ui/src/components/customer-avatar.tsx`

`packages/ui` has a wildcard subpath export (`"./*"` → `./src/components/*.tsx`),
so the new file is importable as `@876/ui/customer-avatar` with **no
`package.json` change**. Do not edit `package.json`.

Export `CustomerAvatar`:

```tsx
export function CustomerAvatar({
  name,
  size = 'sm',
  className,
}: {
  name: string
  size?: 'sm' | 'lg'
  className?: string
})
```

Behaviour, matching what Couriers renders today:

- Initials: first letter of each of the first two whitespace-separated words,
  uppercased, falling back to `'?'` when the name yields nothing. Port
  Couriers' `initialsOf` exactly.
- Colour: deterministic pick from a fixed palette using Couriers' hash
  (`hash = (hash * 31 + name.charCodeAt(i)) | 0`, then
  `Math.abs(hash) % palette.length`). Same name always gets the same colour.
- Palette: keep Couriers' six hues — blue, violet, emerald, amber, rose, cyan —
  and keep the exact light-mode classes (`bg-blue-100 text-blue-700` and so on)
  so the current appearance does not change. **Add a dark-mode variant to each
  entry** (e.g. `dark:bg-blue-950 dark:text-blue-300`); Couriers' inline version
  has none, so today the avatar is unreadable in dark mode. Pick the 950/300
  pairing consistently across all six.
- `size='sm'` renders the table form: `Avatar` with
  `className="size-6 shrink-0 rounded-md after:rounded-md"` and an
  `AvatarFallback` with `rounded-md text-[0.5625rem]` plus the tint classes.
- `size='lg'` renders the detail-header form: `Avatar size="lg"` with
  `className="ring-876-surface size-14 shrink-0 text-lg shadow-sm ring-2 sm:size-16 sm:text-xl"`
  and the tinted `AvatarFallback`.
- Merge any caller `className` onto the `Avatar` root with the `cn` helper from
  `../lib/utils`, the way the sibling components do.
- `'use client'` at the top if — and only if — the primitives require it; check
  `avatar.tsx` before adding it.
- One JSDoc block on the component explaining that the tint is a deterministic
  hash of the name so a customer keeps the same colour everywhere.

## 2. Adopt it in Couriers (replace the inline copy)

In `apps/couriers/src/app/[orgSlug]/customers/_components/customers-table.tsx`:
delete `initialsOf`, `AVATAR_COLORS`, and `avatarColor`, drop the now-unused
`Avatar` / `AvatarFallback` imports, import `CustomerAvatar` from
`@876/ui/customer-avatar`, and render
`<CustomerAvatar name={row.original.customerName} />` in the name cell. Leave
the `OrgAvatar as OrgLogo` import and every other column alone.

In `apps/couriers/src/app/[orgSlug]/customers/[id]/(detail)/layout.tsx`: replace
the `Avatar`/`AvatarFallback` block with `<CustomerAvatar name={name} size="lg" />`
and remove the local `initialsOf` if nothing else uses it. Check before
deleting — grep the file.

The rendered result in light mode must be identical to before.

## 3. Adopt it in Billing

- `apps/billing/src/app/(app)/customers/_components/customers-table.tsx` — add
  `<CustomerAvatar name={...} />` beside the customer name in the name cell,
  wrapping the cell contents in `<div className="flex items-center gap-3">` the
  way Couriers does. Use whatever the row's display-name field is actually
  called; read the file.
- `apps/billing/src/app/(app)/customers/[customerId]/page.tsx` — add
  `<CustomerAvatar name={customer.name} size="lg" />` to the detail header
  beside the title. Read the file and place it so the existing layout still
  reads correctly; do not restructure the header.

  **Careful:** this file already renders a *different* avatar around line 82 —
  an `Avatar`/`AvatarImage`/`AvatarFallback` for the primary **contact**, which
  can carry a real photo (`contact.avatar`). That one is not yours to replace:
  `CustomerAvatar` has no image support and this is a different subject. Leave
  it, and leave the local `initialsOf` it depends on, exactly as they are.

## 4. Adopt it in Invoice

- `apps/invoice/src/app/(app)/customers/_components/customers-table.tsx` — same
  treatment as Billing's table, in the `name` column cell.
- `apps/invoice/src/app/(app)/customers/[customerId]/page.tsx` — same treatment
  as Billing's detail page. **This file may not exist yet**; if it does not,
  skip it and say so in your report rather than creating it.

## Do not

- Do not change `org-avatar.tsx` or any other shared component.
- Do not edit `packages/ui/package.json`.
- Do not change any table's columns, ordering, sorting, or row-click behaviour.
- Do not restyle the name link or change its colour.
- Do not introduce a green tint — green is reserved for status indicators
  (root `CLAUDE.md` → UI Design).

## Verification (run these; paste the output)

```bash
cd /root/projects/876
pnpm --filter @876/ui typecheck
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/couriers-app test
pnpm --filter @876/billing-app test
npx prettier --check packages/ui/src/components/customer-avatar.tsx
```

If a customers-table test snapshots or queries the name cell, it may need
updating — report what changed rather than deleting an assertion.

## Report back

List every file created or changed, paste the verification output, confirm
light-mode appearance is unchanged in Couriers, and note anything in this brief
that did not match the codebase.
