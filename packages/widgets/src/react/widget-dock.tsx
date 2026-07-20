'use client'

import type { ComponentType } from 'react'
import {
  notepadWidgetMetadata,
  type WidgetHost,
  type WidgetMetadata,
  type WidgetSizePolicy,
} from '../catalog'
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

function policyMapFor(
  renderers: readonly SharedWidgetRenderer[]
): Partial<Record<string, WidgetSizePolicy>> {
  return Object.fromEntries(
    renderers.flatMap(({ metadata }) =>
      metadata.sizePolicy ? [[metadata.id, metadata.sizePolicy] as const] : []
    )
  )
}

export function SharedWidgetDock({
  enabledWidgetIds,
  navbarHeight = 56,
  host = 'console',
}: {
  enabledWidgetIds: readonly string[]
  navbarHeight?: number
  host?: WidgetHost
}) {
  const enabled = new Set(enabledWidgetIds)
  const renderers = sharedWidgetRenderers.filter(({ metadata }) =>
    enabled.has(metadata.id)
  )
  if (renderers.length === 0) return null

  const sizePolicyByItem = policyMapFor(renderers)

  return (
    <WidgetPopout.Root
      side="right"
      navbarHeight={navbarHeight}
      host={host}
      sizePolicyByItem={sizePolicyByItem}
    >
      <WidgetPopout.Panel size="md">
        {renderers.map(({ metadata, icon: Icon, panel: Panel }) => (
          <WidgetPopout.Content
            key={metadata.id}
            id={metadata.id}
            title={metadata.name}
            icon={<Icon className="size-6" />}
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
            icon={<Icon className="size-6" />}
          />
        ))}
      </WidgetPopout.Rail>
    </WidgetPopout.Root>
  )
}
