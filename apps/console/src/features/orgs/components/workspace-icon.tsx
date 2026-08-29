import {
  BarChart3,
  CircleStackIcon,
  ClipboardList,
  CreditCard,
  DocumentTextIcon,
  RectangleGroup,
  Settings,
  TruckIcon,
  Users,
} from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import type { WorkspaceIconKey } from '../app-workspaces'

/**
 * Resolves a registry icon key to a component.
 *
 * The registry is plain data so it can cross the RSC boundary, which means the
 * mapping from key to component has to live somewhere that already imports
 * components. This is the same technique `ResourceToolbar`'s dropdown icons use.
 */
const ICONS: Record<WorkspaceIconKey, IconComponent> = {
  dashboard: BarChart3,
  customers: Users,
  requests: ClipboardList,
  settings: Settings,
  billing: CreditCard,
  packages: TruckIcon,
  items: CircleStackIcon,
  teams: Users,
  categories: RectangleGroup,
  forms: DocumentTextIcon,
}

export const WORKSPACE_ICON_COLORS: Record<WorkspaceIconKey, string> = {
  dashboard: 'text-blue-500 dark:text-blue-400',
  customers: 'text-amber-500 dark:text-amber-400',
  requests: 'text-purple-500 dark:text-purple-400',
  settings: 'text-slate-500 dark:text-slate-400',
  billing: 'text-emerald-500 dark:text-emerald-400',
  packages: 'text-orange-500 dark:text-orange-400',
  items: 'text-emerald-500 dark:text-emerald-400',
  teams: 'text-indigo-500 dark:text-indigo-400',
  categories: 'text-rose-500 dark:text-rose-400',
  forms: 'text-teal-500 dark:text-teal-400',
}

export function workspaceIcon(key: WorkspaceIconKey): IconComponent {
  return ICONS[key]
}

export function WorkspaceIcon({
  iconKey,
  colored = false,
  className,
}: {
  iconKey: WorkspaceIconKey
  colored?: boolean
  className?: string
}) {
  // Indexed straight off the module constant rather than through
  // `workspaceIcon()`: a component read from a function call cannot be shown to
  // be stable across renders, and the React lint rule rejects it.
  const Icon = ICONS[iconKey]
  return (
    <Icon
      className={cn(className, colored && WORKSPACE_ICON_COLORS[iconKey])}
      aria-hidden="true"
    />
  )
}
