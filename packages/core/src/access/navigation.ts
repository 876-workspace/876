import { can, hasFeature, type AccessContext } from './context'

/** What a nav entry requires to be visible. Undefined = always visible. */
export interface NavRequirement {
  /** Required permission key. */
  permission?: string
  /** Required feature-flag key. */
  feature?: string
  /** Visible when ANY of these permissions is held. */
  anyPermission?: readonly string[]
}

export interface NavEntry {
  key: string
  title: string
  href: string
  /** A STRING icon key. Never a component — this crosses the RSC boundary. */
  icon: string
  colorClassName?: string
  /**
   * Presentation classes for the entry's ACTIVE state — the tinted, rounded
   * tile behind its icon. A plain string, like `colorClassName`, because this
   * registry crosses the RSC boundary.
   */
  activeClassName?: string
  requires?: NavRequirement
  children?: readonly NavEntry[]
}

export interface NavGroupDefinition {
  key: string
  label?: string
  entries: readonly NavEntry[]
}

export function defineNavigation(
  groups: readonly NavGroupDefinition[]
): readonly NavGroupDefinition[] {
  return groups
}

function requirementPasses(
  requirement: NavRequirement | undefined,
  context: AccessContext
): boolean {
  if (!requirement) return true

  if (
    requirement.permission !== undefined &&
    !can(context, requirement.permission)
  )
    return false

  if (
    requirement.feature !== undefined &&
    !hasFeature(context, requirement.feature)
  )
    return false

  if (requirement.anyPermission !== undefined) {
    if (requirement.anyPermission.length === 0) return false
    if (
      !requirement.anyPermission.some((permission) => can(context, permission))
    )
      return false
  }

  return true
}

function resolveEntries(
  entries: readonly NavEntry[],
  context: AccessContext
): NavEntry[] {
  const result: NavEntry[] = []

  for (const entry of entries) {
    const hasDeclaredChildren = Array.isArray(entry.children)
    const children = hasDeclaredChildren
      ? resolveEntries(entry.children ?? [], context)
      : undefined

    if (hasDeclaredChildren && children?.length === 0) continue
    if (!requirementPasses(entry.requires, context)) continue

    result.push({
      key: entry.key,
      title: entry.title,
      href: entry.href,
      icon: entry.icon,
      ...(entry.colorClassName ? { colorClassName: entry.colorClassName } : {}),
      ...(entry.activeClassName
        ? { activeClassName: entry.activeClassName }
        : {}),
      ...(entry.requires
        ? {
            requires: {
              ...(entry.requires.permission !== undefined
                ? { permission: entry.requires.permission }
                : {}),
              ...(entry.requires.feature !== undefined
                ? { feature: entry.requires.feature }
                : {}),
              ...(entry.requires.anyPermission !== undefined
                ? { anyPermission: [...entry.requires.anyPermission] }
                : {}),
            },
          }
        : {}),
      ...(children ? { children } : {}),
    })
  }

  return result
}

/**
 * Resolves a declarative navigation registry to plain RSC-safe data.
 * Malformed runtime input fails closed to an empty navigation tree.
 */
export function resolveNavigation(
  groups: readonly NavGroupDefinition[],
  context: AccessContext
): NavGroupDefinition[] {
  try {
    if (!Array.isArray(groups)) return []

    return groups.flatMap((group) => {
      if (!group || !Array.isArray(group.entries)) return []

      const entries = resolveEntries(group.entries, context)
      if (entries.length === 0) return []

      return [
        {
          key: group.key,
          ...(group.label !== undefined ? { label: group.label } : {}),
          entries,
        },
      ]
    })
  } catch {
    return []
  }
}
