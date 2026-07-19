import {
  KnowledgeBaseIcon,
  KnowledgeBaseWidgetPanel,
  NotepadIcon,
} from '@876/widgets/react'
import { Terminal, type IconComponent } from '@876/ui/icons'
import type { ComponentType } from 'react'
import type { AdminAuditEvent } from '@876/admin'
import type { PopoutSize } from './popout-bar'

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
  panelSize?: PopoutSize
}

type WidgetRenderer = Omit<Widget, 'id' | 'label'>

function KnowledgeBasePanel(_props: WidgetPanelProps) {
  return <KnowledgeBaseWidgetPanel />
}

const widgetRenderers = {
  notepad: {
    icon: NotepadIcon as IconComponent,
    panel: NotepadWidget,
  },
  knowledge_base: {
    icon: KnowledgeBaseIcon as IconComponent,
    panel: KnowledgeBasePanel,
    panelSize: 'lg' as const,
  },
  live_logs: {
    icon: Terminal,
    panel: LiveLogsWidget,
    panelSize: 'xl',
  },
} satisfies Record<ConsoleWidgetId, WidgetRenderer>

/**
 * Widgets available in the persistent right-hand widget bar. New widgets
 * are added here and rendered on demand.
 */
export const widgets: Widget[] = consoleWidgetCatalog.map((metadata) => {
  const renderer = widgetRenderers[metadata.id]
  return {
    id: metadata.id,
    label: metadata.name,
    ...renderer,
  }
})
