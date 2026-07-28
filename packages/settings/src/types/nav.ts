export type SettingsItemStatus = 'available' | 'planned'

export interface SettingsNavItem {
  title: string
  /** Path relative to the app's settings root, e.g. '/settings/branches'.
   * Required when status is 'available'; omitted when 'planned'. */
  href?: string
  status: SettingsItemStatus
  /** Permission key gating visibility, e.g. 'settings.view'. Omit for always-visible. */
  permission?: string
  /** Module key when this item edits a module's preferences. */
  module?: string
}

export interface SettingsNavGroup {
  key: string
  title: string
  /** String icon key resolved to a component by the consuming app. */
  icon: string
  /**
   * Heading this group renders under, e.g. 'Organization' or 'Modules'.
   * Sections keep a settings hub readable by splitting many groups into a few
   * evenly sized ones — one section of eleven items beside a section of two
   * produces a ragged grid. Groups with no section render first, ungrouped.
   */
  section?: string
  items: SettingsNavItem[]
}

export type SettingsNav = readonly SettingsNavGroup[]
