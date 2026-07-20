'use client'

import { createElement } from 'react'
import type { AdminAuditEvent } from '@876/admin'
import type { WidgetSizePolicy } from '@876/widgets'

import { PopoutBar } from './popout-bar'
import { widgets } from './widgets-config'

const NAVBAR_HEIGHT = 56 // px — matches the shell's `h-14` header

/**
 * Right-hand widget dock in the shell layout (sibling of main content).
 * Panel + icon rail grow/shrink the layout instead of overlaying the body.
 */
export function WidgetBar({
  auditEvents,
  enabledWidgetIds,
}: {
  auditEvents: AdminAuditEvent[]
  enabledWidgetIds: string[]
}) {
  const enabledWidgetIdSet = new Set(enabledWidgetIds)
  const enabledWidgets = widgets.filter((widget) =>
    enabledWidgetIdSet.has(widget.id)
  )
  const sizePolicyByItem: Partial<Record<string, WidgetSizePolicy>> =
    Object.fromEntries(
      enabledWidgets.map((widget) => [widget.id, widget.sizePolicy])
    )

  return (
    <PopoutBar.Root
      side="right"
      navbarHeight={NAVBAR_HEIGHT}
      host="console"
      sizePolicyByItem={sizePolicyByItem}
    >
      {/* Panel first so Root lays out [panel | rail] on the right edge. */}
      <PopoutBar.Panel size="md">
        {enabledWidgets.map((widget) => (
          <PopoutBar.Content
            key={widget.id}
            id={widget.id}
            title={widget.label}
            icon={createElement(widget.icon, {
              className: 'block size-6 shrink-0',
              width: 24,
              height: 24,
            })}
          >
            {createElement(widget.panel, { auditEvents })}
          </PopoutBar.Content>
        ))}
      </PopoutBar.Panel>

      <PopoutBar.Rail>
        {enabledWidgets.map((widget) => (
          <PopoutBar.Trigger
            key={widget.id}
            id={widget.id}
            label={widget.label}
            accent={widget.sizePolicy.accent}
            icon={createElement(widget.icon, {
              className: 'block size-6 shrink-0',
              width: 24,
              height: 24,
            })}
          />
        ))}
      </PopoutBar.Rail>
    </PopoutBar.Root>
  )
}
