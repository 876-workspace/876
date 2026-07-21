'use client'

import { createElement } from 'react'
import type { AdminAuditEvent } from '@876/admin'
import { ChatRail } from '@876/widgets/react'

import { PopoutBar } from './popout-bar'
import { widgets } from './widgets-config'
import type { PopoutSize } from './popout-bar'

const NAVBAR_HEIGHT = 56 // px — matches the shell's `h-14` header

/**
 * Right-hand widget dock in the shell layout (sibling of main content).
 * The icon rail is an in-flow floating card (reserves layout space, never
 * overlays the body); the panel pops out over the body by default and can
 * be docked into the layout column.
 */
export function WidgetBar({
  auditEvents,
  enabledWidgetIds,
  chatEnabled,
}: {
  auditEvents: AdminAuditEvent[]
  enabledWidgetIds: string[]
  chatEnabled: boolean
}) {
  const enabledWidgetIdSet = new Set(enabledWidgetIds)
  const enabledWidgets = widgets.filter((widget) =>
    enabledWidgetIdSet.has(widget.id)
  )
  const sizeByItem: Partial<Record<string, PopoutSize>> = Object.fromEntries(
    enabledWidgets
      .filter((widget) => widget.panelSize)
      .map((widget) => [widget.id, widget.panelSize])
  )

  return (
    <PopoutBar.Root side="right" navbarHeight={NAVBAR_HEIGHT}>
      {/* Panel first so Root lays out [panel | rail] on the right edge. */}
      <PopoutBar.Panel size="md" sizeByItem={sizeByItem}>
        {enabledWidgets.map((widget) => (
          <PopoutBar.Content
            key={widget.id}
            id={widget.id}
            title={widget.label}
            icon={createElement(widget.icon, {
              className: 'block size-[1.125rem] shrink-0',
              width: 18,
              height: 18,
            })}
          >
            {createElement(widget.panel, { auditEvents })}
          </PopoutBar.Content>
        ))}
      </PopoutBar.Panel>

      <PopoutBar.Rail chat={chatEnabled ? <ChatRail /> : undefined}>
        {enabledWidgets.map((widget) => (
          <PopoutBar.Trigger
            key={widget.id}
            id={widget.id}
            label={widget.label}
            icon={createElement(widget.icon, {
              className: 'block size-5 shrink-0',
              width: 20,
              height: 20,
            })}
          />
        ))}
      </PopoutBar.Rail>
    </PopoutBar.Root>
  )
}
