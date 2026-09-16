import type { IconComponent } from '@876/ui/icons'
import { createElement } from 'react'
import {
  ArchiveBoxIcon,
  BarChart3,
  BriefcaseIcon,
  BugAntIcon,
  Building2,
  BuildingLibraryIcon,
  Calendar,
  ChatBubbleLeftIcon,
  ChartPieIcon,
  CircleStackIcon,
  ClipboardList,
  Clock,
  CreditCard,
  Database,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  Flag,
  Folder,
  Home,
  IdentificationIcon,
  KeyRound,
  LayoutGrid,
  LifebuoyIcon,
  MapPin,
  ReceiptPercent,
  RectangleGroup,
  RefreshCw,
  Settings,
  Shield,
  SquaresPlusIcon,
  TagIcon,
  TruckIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserPlus,
  Users,
  ViewColumnsIcon,
  Waves,
  WrenchScrewdriverIcon,
} from '@876/ui/icons'

export const NAV_ICONS: Record<string, IconComponent> = {
  dashboard: BarChart3,
  users: Users,
  organizations: Building2,
  support: LifebuoyIcon,
  security: Shield,
  apps: SquaresPlusIcon,
  widgets: RectangleGroup,
  storage: Database,
  reports: ChartPieIcon,
  settings: Settings,
  roles: IdentificationIcon,
  notifications: Waves,
  projects: BriefcaseIcon,
  folder: Folder,
  issues: BugAntIcon,
  board: ViewColumnsIcon,
  labels: TagIcon,
  phases: Flag,
  cycles: RefreshCw,
  'task-lists': ClipboardList,
  templates: DocumentDuplicateIcon,
  calendar: Calendar,
  time: Clock,
  forms: DocumentTextIcon,
  customers: UserCircleIcon,
  modules: LayoutGrid,
  operations: Waves,
  plans: CreditCard,
  subscribers: UserPlus,
  features: Flag,
  audit: Clock,
  provisioning: WrenchScrewdriverIcon,
  keys: KeyRound,
  overview: Home,

  // Workspace section icons. A workspace context renders in this same rail, so
  // its keys resolve here; `resolveNavIcon` falls back to a generic square, so
  // a missing key would degrade silently rather than fail. `nav-icons.test.ts`
  // asserts every `WorkspaceIconKey` is present, and the components match
  // `WorkspaceIcon`'s so a section looks identical wherever it is rendered.
  requests: ChatBubbleLeftIcon,
  billing: CreditCard,
  packages: TruckIcon,
  items: CircleStackIcon,
  teams: UserGroupIcon,
  categories: RectangleGroup,
  payments: ReceiptPercent,
  banking: BuildingLibraryIcon,
  branches: MapPin,
  warehouses: ArchiveBoxIcon,
}

/**
 * The colour an icon carries when its entry declares none.
 *
 * A drill-down context's entries are built from a product's own section
 * registry (`workspace-sidebar-context.ts`) or from a platform entry's
 * children, and neither carries presentation. Colouring by **icon key** rather
 * than by entry means every context inherits the platform rail's palette
 * automatically — a workspace that gains a section next week is coloured
 * without touching this file — and the same concept keeps the same colour
 * wherever it appears, which is what makes the rail readable at a glance.
 *
 * An entry's own `colorClassName` still wins; this is only the fallback.
 */
export const NAV_ICON_COLORS: Record<string, string> = {
  dashboard: 'text-blue-500 dark:text-blue-400',
  overview: 'text-blue-500 dark:text-blue-400',
  users: 'text-amber-500 dark:text-amber-400',
  customers: 'text-amber-500 dark:text-amber-400',
  subscribers: 'text-amber-500 dark:text-amber-400',
  teams: 'text-amber-500 dark:text-amber-400',
  organizations: 'text-amber-500 dark:text-amber-400',
  support: 'text-cyan-500 dark:text-cyan-400',
  requests: 'text-cyan-500 dark:text-cyan-400',
  forms: 'text-cyan-500 dark:text-cyan-400',
  security: 'text-rose-500 dark:text-rose-400',
  keys: 'text-rose-500 dark:text-rose-400',
  roles: 'text-rose-500 dark:text-rose-400',
  audit: 'text-rose-500 dark:text-rose-400',
  apps: 'text-purple-500 dark:text-purple-400',
  widgets: 'text-emerald-500 dark:text-emerald-400',
  modules: 'text-emerald-500 dark:text-emerald-400',
  features: 'text-emerald-500 dark:text-emerald-400',
  storage: 'text-blue-500 dark:text-blue-400',
  reports: 'text-amber-500 dark:text-amber-400',
  settings: 'text-slate-500 dark:text-slate-400',
  provisioning: 'text-slate-500 dark:text-slate-400',
  operations: 'text-slate-500 dark:text-slate-400',
  notifications: 'text-sky-500 dark:text-sky-400',
  projects: 'text-indigo-500 dark:text-indigo-400',
  folder: 'text-indigo-500 dark:text-indigo-400',
  issues: 'text-indigo-500 dark:text-indigo-400',
  board: 'text-violet-500 dark:text-violet-400',
  labels: 'text-fuchsia-500 dark:text-fuchsia-400',
  phases: 'text-violet-500 dark:text-violet-400',
  cycles: 'text-cyan-500 dark:text-cyan-400',
  'task-lists': 'text-indigo-500 dark:text-indigo-400',
  templates: 'text-indigo-500 dark:text-indigo-400',
  calendar: 'text-sky-500 dark:text-sky-400',
  time: 'text-teal-500 dark:text-teal-400',
  categories: 'text-fuchsia-500 dark:text-fuchsia-400',
  billing: 'text-teal-500 dark:text-teal-400',
  payments: 'text-teal-500 dark:text-teal-400',
  plans: 'text-teal-500 dark:text-teal-400',
  banking: 'text-teal-500 dark:text-teal-400',
  items: 'text-orange-500 dark:text-orange-400',
  packages: 'text-orange-500 dark:text-orange-400',
  warehouses: 'text-orange-500 dark:text-orange-400',
  branches: 'text-lime-600 dark:text-lime-400',
}

/** The fallback colour for an entry whose icon key declares none. */
export function resolveNavIconColor(key: string): string {
  return NAV_ICON_COLORS[key] ?? 'text-muted-foreground'
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
