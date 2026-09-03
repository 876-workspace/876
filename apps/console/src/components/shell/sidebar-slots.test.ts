import type { AccessContext } from '@876/core/access'
import { describe, expect, it } from 'vitest'

import { resolveSidebarSlots, type SidebarSlotDefinition } from '@/components/shell/sidebar-slots'

const context: AccessContext = {
  subject: { userId: 'user_1' },
  permissions: ['crm/requests.view', 'console:ops'],
  features: ['console_live_status'],
  experiments: {},
}

const definitions: readonly SidebarSlotDefinition[] = [
  {
    key: 'always',
    region: 'top',
    title: 'Always visible',
    icon: 'sparkles',
    componentKey: 'announcement',
  },
  {
    key: 'permissioned',
    region: 'above-nav',
    title: 'Permissioned',
    icon: 'shield',
    componentKey: 'operator-card',
    requires: { permission: 'console:ops' },
  },
  {
    key: 'featured',
    region: 'below-nav',
    title: 'Feature gated',
    icon: 'signal',
    componentKey: 'live-status',
    requires: { feature: 'console_live_status' },
  },
  {
    key: 'missing-permission',
    region: 'footer',
    title: 'Hidden permission',
    icon: 'lock',
    componentKey: 'hidden',
    requires: { permission: 'console:admin' },
  },
  {
    key: 'missing-feature',
    region: 'footer',
    title: 'Hidden feature',
    icon: 'lock',
    componentKey: 'hidden',
    requires: { feature: 'console_future' },
  },
]

describe('resolveSidebarSlots', () => {
  it('keeps only slots whose permission and feature requirements pass', () => {
    expect(resolveSidebarSlots(definitions, context).map((slot) => slot.key)).toEqual([
      'always',
      'permissioned',
      'featured',
    ])
  })

  it('keeps resolved slots RSC-safe by stripping requirements', () => {
    const resolved = resolveSidebarSlots(definitions, context)
    expect(resolved[1]).toEqual({
      key: 'permissioned',
      region: 'above-nav',
      title: 'Permissioned',
      icon: 'shield',
      componentKey: 'operator-card',
    })
    expect(JSON.parse(JSON.stringify(resolved))).toEqual(resolved)
  })

  it('treats an empty anyPermission requirement as unsatisfiable', () => {
    const [slot] = resolveSidebarSlots(
      [
        {
          key: 'empty-any',
          region: 'footer',
          title: 'Empty any',
          icon: 'lock',
          componentKey: 'hidden',
          requires: { anyPermission: [] },
        },
      ],
      context
    )

    expect(slot).toBeUndefined()
  })
})
