# Toolbar Rules

Read this before adding or modifying toolbar UI in Console, Enterprise,
Couriers, or any other sidebar-style 876 app. Does not apply to `@876/app`
(consumer), which has its own layout. See also `.claude/rules/app-layout.md`
for the surrounding page container/back-link/forms-vs-dialogs rules.

## List-view toolbar (`ResourceToolbar`)

Every list page has a single `ResourceToolbar` at the top:

```
[Title]                    [+ Add]  [···]
```

- **Primary button** — solid blue (`primaryVariant="info"`). Opens the create page or dialog.
- **More-actions dropdown** (`···`) — outline icon-sm button so it reads as clearly clickable. Pass `refresh` to add a Refresh item internally; pass `dropdownActions` for the rest.

### Dropdown item order

1. Refresh (rendered first when `refresh` prop is set — handled internally, no onClick needed)
2. ─── separator ───
3. Import (`icon: 'import'`, `ArrowUpFromLine`)
4. Export (`icon: 'export'`, `ArrowDownFromLine`)
5. ─── separator ───
6. Delete (`icon: 'delete'`, `destructive: true`) — always last, always red

Label text is the bare verb only: "Import", "Export", "Delete users". The page title provides the resource context.

### Serialization constraint

Icon components cannot cross the RSC → client boundary. `DropdownAction.icon` is a string key (`'import' | 'export' | 'delete'`) resolved to actual components inside `ResourceToolbar`. Never pass icon components as props from server pages.

`refresh` is an internal behavior — `ResourceToolbar` calls `router.refresh()` itself. Do not pass a refresh callback from a server page.

### Filterable title (`titleFilter`)

`ResourceToolbar` accepts an optional `titleFilter?: ReactNode` that renders
in place of the plain `title` heading, in the same layout slot — the
right-side Add button and `···` dropdown are unaffected. Pass a
`StatusFilterHeading` (`@/components/status-filter-heading`) to turn the
page title itself into a status filter, Zoho-Books-style: the heading shows
the active status with a chevron, and clicking it opens a dropdown of
status options. `title` is still required (kept as the fallback label and
for any caller relying on the plain string). See
`.claude/rules/list-filter-header.md` for the full pattern and rollout
requirements (status must be threaded into the `$876.<resource>.list()`
call — never faked with client-side filtering).

## Detail-view toolbar

Detail page headers carry inline actions, not `ResourceToolbar`:

```
[Avatar/Logo]  [Name · badge]      [Edit]  [···]
               [metadata row]
```

- **Edit button** — outline variant with `Pencil` icon.
- **More-actions dropdown** (`···`) — outline icon-sm, `min-w-44 w-auto` on `DropdownMenuContent`.
- **Mobile actions** — show safe, common actions as individual bordered icon
  buttons below the entity metadata. Keep the vertical header padding tight on
  mobile. The final button may be a `More` dropdown; use it for sensitive or
  destructive options such as reset password, ban/unban, and delete.

### Detail dropdown item order

Entity-specific actions first → separator → Export → separator → Delete (destructive, last).

Never place a separator as the first child of `DropdownMenuContent`.

Detail action labels use bare verbs because the page header already supplies the
resource context: `Edit`, `Reset`, `Ban`, `Unban`, `Export`, `Delete`. Do not use
`Export user`, `Delete organization`, or similar repeated nouns in detail
toolbars.

## Icon sizes

- `size-3.5` in labeled buttons (Edit, Add)
- `size-4` in icon-only buttons and all dropdown items
