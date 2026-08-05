/**
 * The three user-detail layouts under evaluation, selected with `?variant=`.
 *
 * They live behind one URL param on the real route rather than three throwaway
 * routes, so all three read real data through one auth guard and one `_data.ts`,
 * the header treatments they differ on stay comparable, and retiring the losers
 * is deleting a file and a switch arm.
 */
export const USER_VIEW_VARIANTS = ['command', 'desk', 'relationship'] as const

export type UserViewVariant = (typeof USER_VIEW_VARIANTS)[number]

export const DEFAULT_USER_VIEW_VARIANT: UserViewVariant = 'command'

export function isUserViewVariant(value: unknown): value is UserViewVariant {
  return USER_VIEW_VARIANTS.includes(value as UserViewVariant)
}

/** Resolve the variant from a raw `searchParams` value, falling back to the default. */
export function resolveUserViewVariant(value: unknown): UserViewVariant {
  return isUserViewVariant(value) ? value : DEFAULT_USER_VIEW_VARIANT
}

/**
 * Switcher labels. Plain serialisable data so a server component can hand it
 * straight to the client switcher — no icon components across the RSC boundary,
 * the same constraint `ResourceToolbar`'s `DropdownAction.icon` works under.
 */
export const USER_VIEW_VARIANT_OPTIONS: {
  value: UserViewVariant
  label: string
  hint: string
}[] = [
  {
    value: 'command',
    label: 'Command',
    hint: 'Dense operations view — everything on one surface',
  },
  {
    value: 'desk',
    label: 'Desk',
    hint: 'Agent view — identity rail beside a request timeline',
  },
  {
    value: 'relationship',
    label: 'Relationship',
    hint: 'Account 360 — who this person is to us, per organization',
  },
]
