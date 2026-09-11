import {
  BarChart3,
  Building2,
  CalculatorIcon,
  ChartPieIcon,
  CircleStackIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  Clock,
  CreditCard,
  ReceiptPercent,
  RefreshCw,
  Settings,
  UsersIcon,
  type IconComponent,
} from '@876/ui/icons'

/** Semantic icon registry for every Invoice rail entry. */
export const INVOICE_NAV_ICONS: Record<string, IconComponent> = {
  dashboard: BarChart3,
  customers: UsersIcon,
  items: ClipboardDocumentListIcon,
  quotes: CalculatorIcon,
  // Distinct from `items`: `ClipboardList` is an alias of
  // `ClipboardDocumentListIcon` in `@876/ui`, so reusing either made two rail
  // entries render the same glyph.
  invoices: DocumentTextIcon,
  'recurring-invoices': RefreshCw,
  'sales-receipts': ReceiptPercent,
  payments: CreditCard,
  expenses: Building2,
  'time-tracking': Clock,
  reports: ChartPieIcon,
  settings: Settings,
}

export function resolveInvoiceNavIcon(key: string): IconComponent {
  return INVOICE_NAV_ICONS[key] ?? Settings
}
