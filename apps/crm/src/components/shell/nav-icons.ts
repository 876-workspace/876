import {
  AlertCircle,
  BarChart3,
  Building2,
  ClipboardList,
  DocumentTextIcon,
  RectangleGroup,
  Settings,
  Users,
  type IconComponent,
} from '@876/ui/icons'

export const NAV_ICONS: Record<string, IconComponent> = {
  dashboard: BarChart3,
  requests: ClipboardList,
  customers: Users,
  forms: DocumentTextIcon,
  teams: Building2,
  categories: RectangleGroup,
  priorities: AlertCircle,
  settings: Settings,
}

export function resolveNavIcon(key: string): IconComponent {
  return NAV_ICONS[key] ?? Settings
}
