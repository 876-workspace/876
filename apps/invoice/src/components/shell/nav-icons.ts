import {
  BarChart3,
  Building2,
  ChartPieIcon,
  CircleStackIcon,
  ClipboardList,
  Clock,
  CreditCard,
  ReceiptPercent,
  Settings,
  StickyNote,
  UserCircleIcon,
  type IconComponent,
} from '@876/ui/icons'

/** Semantic icon registry for every Invoice rail entry. */
export const INVOICE_NAV_ICONS: Record<string, IconComponent> = {
  dashboard: BarChart3,
  customers: UserCircleIcon,
  items: CircleStackIcon,
  quotes: StickyNote,
  invoices: ClipboardList,
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
