import { can, hasFeature, type AccessContext, type NavRequirement } from '@876/core/access'

export type SidebarSlotRegion =
  | 'top'
  | 'above-nav'
  | 'below-nav'
  | 'footer'

/**
 * A serializable declaration for future rich shell content. The client shell
 * receives only resolved entries; `componentKey` is looked up by the shell.
 */
export type SidebarSlotDefinition = {
  key: string
  region: SidebarSlotRegion
  title: string
  icon: string
  componentKey: string
  requires?: NavRequirement
}

export type SidebarSlot = Omit<SidebarSlotDefinition, 'requires'>

export const sidebarSlotDefinitions = [] as const satisfies readonly SidebarSlotDefinition[]

function requirementPasses(
  requirement: NavRequirement | undefined,
  context: AccessContext
): boolean {
  if (!requirement) return true
  if (requirement.permission && !can(context, requirement.permission)) return false
  if (requirement.feature && !hasFeature(context, requirement.feature)) return false
  if (
    requirement.anyPermission &&
    (requirement.anyPermission.length === 0 ||
      !requirement.anyPermission.some((permission) => can(context, permission)))
  )
    return false
  return true
}

/** Resolves slot declarations before they cross the RSC boundary. */
export function resolveSidebarSlots(
  definitions: readonly SidebarSlotDefinition[],
  context: AccessContext
): SidebarSlot[] {
  return definitions
    .filter((slot) => requirementPasses(slot.requires, context))
    .map(({ requires: _requires, ...slot }) => slot)
}
