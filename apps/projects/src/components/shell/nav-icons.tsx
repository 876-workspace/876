import { createElement } from 'react'
import type { IconComponent } from '@876/ui/icons'
import {
  Home,
  Building2,
  DocumentTextIcon,
  ExclamationCircleIcon,
  Folder,
  RectangleStackIcon,
  Settings,
  TagIcon,
  Users,
} from '@876/ui/icons'

/**
 * The Projects rail resolves serializable navigation icon keys here, rather
 * than putting icon components in the server-owned navigation registry.
 */
export const NAV_ICONS: Record<string, IconComponent> = {
  dashboard: Home,
  projects: Folder,
  phases: RectangleStackIcon,
  issues: ExclamationCircleIcon,
  board: RectangleStackIcon,
  labels: TagIcon,
  teams: Building2,
  members: Users,
  forms: DocumentTextIcon,
  settings: Settings,
}

export function resolveNavIcon(key: string): IconComponent {
  return NAV_ICONS[key] ?? Settings
}

export function NavIcon({
  icon,
  className,
}: {
  icon: string
  className?: string
}) {
  return createElement(resolveNavIcon(icon), {
    'aria-hidden': 'true',
    className,
  })
}
