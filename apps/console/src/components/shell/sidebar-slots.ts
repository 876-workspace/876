import {
  navRequirementPasses,
  type AccessContext,
  type NavRequirement,
} from '@876/core/access'

/**
 * Where a slot sits relative to the context's navigation.
 *
 * Ordered as they render, top to bottom, so the rail's composition is readable
 * from this one declaration rather than from the order of JSX in the shell.
 */
export const SIDEBAR_SLOT_REGIONS = [
  'top',
  'above-nav',
  'below-nav',
  'footer',
] as const

export type SidebarSlotRegion = (typeof SIDEBAR_SLOT_REGIONS)[number]

/**
 * A non-navigation element of the rail — a card, a standalone button, an
 * announcement, a live indicator.
 *
 * Declared as plain data so it crosses the RSC boundary with the navigation it
 * sits beside: `componentKey` is resolved by the client shell exactly as an
 * icon key is, and never a component. `title` and `icon` are what the collapsed
 * rail shows, because the rail is collapsed by default at every level — a slot
 * that can only render expanded has nothing to show for most of its life.
 */
export type SidebarSlotDefinition = {
  key: string
  region: SidebarSlotRegion
  title: string
  icon: string
  componentKey: string
  requires?: NavRequirement
}

/** A slot after gating, with its requirement stripped. */
export type SidebarSlot = Omit<SidebarSlotDefinition, 'requires'>

/**
 * Console's declared slots.
 *
 * Deliberately empty: Phase 1 ships the mechanism, not the first card. The
 * regions above and `resolveSidebarSlots` are what a later card plugs into.
 */
export const sidebarSlotDefinitions: readonly SidebarSlotDefinition[] = []

/**
 * Resolves slot declarations before they cross the RSC boundary.
 *
 * Gated by the same predicate as nav entries, so a slot cannot become the one
 * place on the rail where a permission is not checked.
 */
export function resolveSidebarSlots(
  definitions: readonly SidebarSlotDefinition[],
  context: AccessContext
): SidebarSlot[] {
  return definitions
    .filter((slot) => navRequirementPasses(slot.requires, context))
    .map(({ requires: _requires, ...slot }) => slot)
}
