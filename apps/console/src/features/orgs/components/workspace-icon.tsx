import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Settings,
  TruckIcon,
  Users,
} from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'

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
}

export function workspaceIcon(key: WorkspaceIconKey): IconComponent {
  return ICONS[key]
}

export function WorkspaceIcon({
  iconKey,
  className,
}: {
  iconKey: WorkspaceIconKey
  className?: string
}) {
  // Indexed straight off the module constant rather than through
  // `workspaceIcon()`: a component read from a function call cannot be shown to
  // be stable across renders, and the React lint rule rejects it.
  const Icon = ICONS[iconKey]
  return <Icon className={className} aria-hidden="true" />
}
