import type { IconComponent } from '@876/ui/icons'
import { createElement } from 'react'
import {
  BarChart3,
  Building2,
  ChatBubbleLeftIcon,
  ChartPieIcon,
  CircleStackIcon,
  ClipboardList,
  Database,
  DocumentTextIcon,
  Folder,
  KeyRound,
  LayoutGrid,
  MapPin,
  ReceiptPercent,
  RectangleGroup,
  Settings,
  SquaresPlusIcon,
  TagIcon,
  TruckIcon,
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
  operations: Waves,
  plans: CreditCard,
  subscribers: Users,
  features: Flag,
  audit: ClipboardList,
  provisioning: WrenchScrewdriverIcon,
  keys: KeyRound,
  overview: BarChart3,

  // Workspace section icons. A workspace context renders in this same rail, so
  // its keys resolve here; `resolveNavIcon` falls back to a generic square, so
  // a missing key would degrade silently rather than fail. `nav-icons.test.ts`
  // asserts every `WorkspaceIconKey` is present, and the components match
  // `WorkspaceIcon`'s so a section looks identical wherever it is rendered.
  requests: ClipboardList,
  billing: CreditCard,
  packages: TruckIcon,
  items: CircleStackIcon,
  teams: Users,
  categories: RectangleGroup,
  payments: ReceiptPercent,
  banking: Building2,
  branches: MapPin,
  warehouses: Building2,
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
