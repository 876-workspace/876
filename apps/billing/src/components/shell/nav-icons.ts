import {
  BarChart3,
  Building2,
  BuildingLibraryIcon,
  ChartPieIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  IdentificationIcon,
  RectangleStackIcon,
  RefreshCw,
  Settings,
  UsersIcon,
  type IconComponent,
} from '@876/ui/icons'

/** Semantic icon registry for every Billing rail entry. */
export const BILLING_NAV_ICONS: Record<string, IconComponent> = {
  dashboard: BarChart3,
  customers: UsersIcon,
  requests: ClipboardDocumentListIcon,
  forms: RectangleStackIcon,
  items: ClipboardDocumentListIcon,
  // `ClipboardList` is an alias of `ClipboardDocumentListIcon` in `@876/ui`, so
  // sharing it with `items` made two rail entries render the same glyph.
  sales: DocumentTextIcon,
  subscriptions: RefreshCw,
  purchases: Building2,
  banking: BuildingLibraryIcon,
  payroll: IdentificationIcon,
  reports: ChartPieIcon,
  settings: Settings,
}

export function resolveBillingNavIcon(key: string): IconComponent {
  return BILLING_NAV_ICONS[key] ?? Settings
}
