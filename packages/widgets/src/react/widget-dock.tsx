'use client'

import type { ComponentType, ReactNode } from 'react'
import { CalendarDaysIcon } from '@876/ui/icons'

import {
  EMPTY_WORK_WIDGET_CAPABILITIES,
  type WorkWidgetCapabilities,
} from '../work-capabilities'
import {
  notepadWidgetMetadata,
  workWidgetMetadata,
  type WidgetMetadata,
} from '../catalog'
import { NotepadWidgetPanel } from './notepad-widget'
import { NotepadIcon } from './notepad-icon'
import { WorkWidgetPanel } from './work-widget'
import { ChatRail } from './chat-rail'
import { WidgetPopout } from './widget-popout'

interface SharedWidgetRenderer {
  metadata: WidgetMetadata
  icon: ComponentType<{ className?: string }>
  renderPanel: (context: {
    workCapabilities: WorkWidgetCapabilities
  }) => ReactNode
}

const sharedWidgetRenderers: readonly SharedWidgetRenderer[] = [
  {
    metadata: notepadWidgetMetadata,
    icon: NotepadIcon,
    renderPanel: () => <NotepadWidgetPanel />,
  },
  {
    metadata: workWidgetMetadata,
    icon: CalendarDaysIcon,
    renderPanel: ({ workCapabilities }) => (
      <WorkWidgetPanel capabilities={workCapabilities} />
    ),
  },
]

const sharedWidgetPanelWidths: Partial<Record<string, number>> =
  Object.fromEntries(
    sharedWidgetRenderers.map(({ metadata }) => [
      metadata.id,
      metadata.defaultPanel.width,
    ])
  )

export function SharedWidgetDock({
  enabledWidgetIds,
  workCapabilities = EMPTY_WORK_WIDGET_CAPABILITIES,
  chatEnabled = false,
  navbarHeight = 56,
}: {
  enabledWidgetIds: readonly string[]
  workCapabilities?: WorkWidgetCapabilities
  /** Renders the 876 Chat rail card below the widget triggers. */
  chatEnabled?: boolean
  navbarHeight?: number
}) {
  const enabled = new Set(enabledWidgetIds)
  const renderers = sharedWidgetRenderers.filter(({ metadata }) =>
    enabled.has(metadata.id)
  )
  if (renderers.length === 0 && !chatEnabled) return null

  return (
    <WidgetPopout.Root side="right" navbarHeight={navbarHeight}>
      <WidgetPopout.Panel widthByItem={sharedWidgetPanelWidths}>
        {renderers.map(({ metadata, icon: Icon, renderPanel }) => (
          <WidgetPopout.Content
            key={metadata.id}
            id={metadata.id}
            title={metadata.name}
            icon={<Icon />}
          >
            {renderPanel({ workCapabilities })}
          </WidgetPopout.Content>
        ))}
      </WidgetPopout.Panel>
      <WidgetPopout.Rail chat={chatEnabled ? <ChatRail /> : undefined}>
        {renderers.map(({ metadata, icon: Icon }) => (
          <WidgetPopout.Trigger
            key={metadata.id}
            id={metadata.id}
            label={metadata.name}
            icon={<Icon />}
          />
        ))}
      </WidgetPopout.Rail>
    </WidgetPopout.Root>
  )
}
