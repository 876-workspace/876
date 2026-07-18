'use client'

import type { ComponentType } from 'react'
import { notepadWidgetMetadata, type WidgetMetadata } from '../catalog'
import { NotepadWidgetPanel } from './notepad-widget'
import { NotepadIcon } from './notepad-icon'
import { WidgetPopout } from './widget-popout'

interface SharedWidgetRenderer {
  metadata: WidgetMetadata
  icon: ComponentType<{ className?: string }>
  panel: ComponentType
}

const sharedWidgetRenderers: readonly SharedWidgetRenderer[] = [
  {
    metadata: notepadWidgetMetadata,
    icon: NotepadIcon,
    panel: NotepadWidgetPanel,
  },
]

export function SharedWidgetDock({
  enabledWidgetIds,
  navbarHeight = 56,
}: {
  enabledWidgetIds: readonly string[]
  navbarHeight?: number
}) {
  const enabled = new Set(enabledWidgetIds)
  const renderers = sharedWidgetRenderers.filter(({ metadata }) =>
    enabled.has(metadata.id)
  )
  if (renderers.length === 0) return null

  return (
    <WidgetPopout.Root side="right" navbarHeight={navbarHeight}>
      <WidgetPopout.Panel size="md">
        {renderers.map(({ metadata, icon: Icon, panel: Panel }) => (
          <WidgetPopout.Content
            key={metadata.id}
            id={metadata.id}
            title={metadata.name}
            icon={<Icon />}
          >
            <Panel />
          </WidgetPopout.Content>
        ))}
      </WidgetPopout.Panel>
      <WidgetPopout.Rail>
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
