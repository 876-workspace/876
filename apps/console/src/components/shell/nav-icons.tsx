import type { IconComponent } from '@876/ui/icons'
import { createElement } from 'react'
import {
  BarChart3,
  Building2,
  ChatBubbleLeftIcon,
  ChartPieIcon,
  ClipboardList,
  Database,
  DocumentTextIcon,
  Folder,
  KeyRound,
  LayoutGrid,
  RectangleGroup,
  Settings,
  SquaresPlusIcon,
  TagIcon,
  CreditCard,
  Flag,
  Users,
  Waves,
  WrenchScrewdriverIcon,
} from '@876/ui/icons'

export const NAV_ICONS: Record<string, IconComponent> = {
  dashboard: BarChart3,
  users: Users,
  organizations: Building2,
  support: ChatBubbleLeftIcon,
  security: KeyRound,
  apps: SquaresPlusIcon,
  widgets: RectangleGroup,
  storage: Database,
  reports: ChartPieIcon,
  settings: Settings,
  roles: KeyRound,
  notifications: Waves,
  projects: Folder,
  folder: Folder,
  issues: ClipboardList,
  board: LayoutGrid,
  labels: TagIcon,
  forms: DocumentTextIcon,
  customers: Users,
  modules: LayoutGrid,
  plans: CreditCard,
  subscribers: Users,
  features: Flag,
  audit: ClipboardList,
  provisioning: WrenchScrewdriverIcon,
  keys: KeyRound,
  overview: BarChart3,
}

export function resolveNavIcon(key: string): IconComponent {
  return NAV_ICONS[key] ?? RectangleGroup
}

/**
 * Render a nav icon from its string key. A component resolved into a
 * capitalized local during render trips `react-hooks/static-components`, so
 * the lookup is wrapped in a stable component instead.
 */
export function NavIcon({
  icon,
  className,
}: {
  icon: string
  className?: string
}) {
  // createElement, not JSX: assigning the resolved component to a capitalized
  // local reads to `react-hooks/static-components` as a component defined
  // during render.
  return createElement(resolveNavIcon(icon), {
    'aria-hidden': 'true',
    className,
  })
}
