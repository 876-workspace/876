'use client'

import type { IconComponent } from '@876/ui/icons'
import {
  BarChart3,
  Building2,
  ChatBubbleLeftIcon,
  ChartPieIcon,
  Database,
  KeyRound,
  RectangleGroup,
  Settings,
  SquaresPlusIcon,
  Users,
  Waves,
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
}

export function resolveNavIcon(key: string): IconComponent {
  return NAV_ICONS[key] ?? RectangleGroup
}
