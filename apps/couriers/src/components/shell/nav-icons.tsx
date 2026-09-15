import type { IconComponent } from '@876/ui/icons'
import {
  Activity,
  AdjustmentsHorizontalIcon,
  ArchiveBoxIcon,
  BellAlertIcon,
  BuildingLibraryIcon,
  BuildingOffice2Icon,
  CalculatorIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  DocumentTextIcon,
  MapIcon,
  PaintBrushIcon,
  ReceiptPercentIcon,
  Settings,
  ShieldCheckIcon,
  SquaresPlusIcon,
  TruckIcon,
  UsersIcon,
  WindowIcon,
} from '@876/ui/icons'

/**
 * String-key → component resolution for the settings context rail. The nav
 * registry carries keys so it stays RSC-serializable; the client shell
 * resolves them here, exactly as Console's `nav-icons` does for its rail.
 */
export const SETTINGS_NAV_ICONS: Record<string, IconComponent> = {
  'org-profile': BuildingOffice2Icon,
  branding: PaintBrushIcon,
  locations: MapIcon,
  users: UsersIcon,
  roles: ShieldCheckIcon,
  subscription: CreditCardIcon,
  'module-items': ArchiveBoxIcon,
  'module-warehouse': BuildingLibraryIcon,
  'module-manifests': ClipboardDocumentListIcon,
  'module-deliveries': TruckIcon,
  'module-invoices': DocumentTextIcon,
  'module-payments': ReceiptPercentIcon,
  'module-portal': WindowIcon,
  finance: CalculatorIcon,
  customization: AdjustmentsHorizontalIcon,
  notifications: BellAlertIcon,
  integrations: SquaresPlusIcon,
  automation: Activity,
  settings: Settings,
}

export function resolveSettingsNavIcon(key: string): IconComponent {
  return SETTINGS_NAV_ICONS[key] ?? Settings
}
