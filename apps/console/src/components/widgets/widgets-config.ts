import { NotepadIcon } from '@876/widgets/react'
import type { WidgetSize, WidgetSizePolicy } from '@876/widgets'
import { Terminal, type IconComponent } from '@876/ui/icons'
import type { ComponentType } from 'react'
import type { AdminAuditEvent } from '@876/admin'

import { LiveLogsWidget } from './live-logs-widget'
import { NotepadWidget } from './notepad-widget'
import { consoleWidgetCatalog, type ConsoleWidgetId } from './widget-catalog'

export type WidgetPanelProps = {
  auditEvents: AdminAuditEvent[]
}

/** A single widget mounted in the widget bar. */
export type Widget = {
  id: string
  label: string
  icon: IconComponent
  panel: ComponentType<WidgetPanelProps>
  sizePolicy: WidgetSizePolicy
  /** @deprecated Prefer sizePolicy.default with a single allowed size. */
  panelSize?: WidgetSize
}

type WidgetRenderer = {
  icon: IconComponent
  panel: ComponentType<WidgetPanelProps>
  sizePolicy?: WidgetSizePolicy
  panelSize?: WidgetSize
}

const liveLogsSizePolicy = {
  default: 'xl',
  allowed: ['xl'],
  accent: '#06B6D4', // cyan / electric
} as const satisfies WidgetSizePolicy

const widgetRenderers: Record<ConsoleWidgetId, WidgetRenderer> = {
  notepad: {
    icon: NotepadIcon as IconComponent,
    panel: NotepadWidget,
  },
  live_logs: {
    icon: Terminal,
    panel: LiveLogsWidget,
    sizePolicy: liveLogsSizePolicy,
    panelSize: 'xl',
  },
}

/**
 * Widgets available in the persistent right-hand widget bar. New widgets
 * are added here and rendered on demand.
 */
export const widgets: Widget[] = consoleWidgetCatalog.map((metadata) => {
  const renderer = widgetRenderers[metadata.id]
  const sizePolicy: WidgetSizePolicy = renderer.sizePolicy ??
    metadata.sizePolicy ?? {
      default: 'md',
      allowed: ['md'],
    }

  return {
    id: metadata.id,
    label: metadata.name,
    icon: renderer.icon,
    panel: renderer.panel,
    sizePolicy,
    panelSize: renderer.panelSize,
  }
})
