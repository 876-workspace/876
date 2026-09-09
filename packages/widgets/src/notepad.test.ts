import { describe, expect, it } from 'vitest'

import {
  chatWidgetMetadata,
  getRequiredWidgetFeatureSlugs,
  getWidgetFeatureSlugs,
  isWidgetEnabled,
  isWidgetsDataOwner,
  notepadWidgetMetadata,
  resolveAccessibleWidgetIds,
  resolveEnabledWidgetIds,
  WIDGET_HOST_APP_SLUGS,
  WIDGET_HOST_LABELS,
  widgetCatalog,
  workWidgetMetadata,
} from './catalog'

describe('shared widget catalog', () => {
  it('exports portable widgets only', () => {
    expect(widgetCatalog.map((widget) => widget.id)).toEqual([
      'notepad',
      'work',
      'chat',
    ])
    expect(widgetCatalog.map((widget) => widget.id)).not.toContain('live_logs')
  })

  it('marks notepad as widgets-owned shared content', () => {
    expect(notepadWidgetMetadata.distribution).toBe('shared')
    expect(notepadWidgetMetadata.dataOwner).toBe('widgets')
    expect(isWidgetsDataOwner(notepadWidgetMetadata)).toBe(true)
  })

  it('presents Calendar as organization-owned Work-backed content', () => {
    expect(workWidgetMetadata.id).toBe('work')
    expect(workWidgetMetadata.name).toBe('876 Calendar')
    expect(workWidgetMetadata.description).toContain('powered by 876 Work')
    expect(workWidgetMetadata.distribution).toBe('shared')
    expect(workWidgetMetadata.dataOwner).toBe('external')
    expect(workWidgetMetadata.ownership).toBe('organization')
    expect(workWidgetMetadata.surface).toBe('panel')
    expect(workWidgetMetadata.defaultPanel.width).toBe(520)
    expect(isWidgetsDataOwner(workWidgetMetadata)).toBe(false)
  })

  it('derives every host gate from the typed widget definition', () => {
    expect(getWidgetFeatureSlugs(notepadWidgetMetadata)).toEqual([
      'platform-widgets',
      'platform-widgets-notepad',
      'console-widgets',
      'console-widgets-notepad',
      'billing-widgets',
      'billing-widgets-notepad',
      'couriers-widgets',
      'couriers-widgets-notepad',
    ])
    const billingRequirements = getRequiredWidgetFeatureSlugs(
      notepadWidgetMetadata,
      'billing'
    )
    expect(
      isWidgetEnabled(
        notepadWidgetMetadata,
        'billing',
        new Set(billingRequirements)
      )
    ).toBe(true)
    expect(
      isWidgetEnabled(
        notepadWidgetMetadata,
        'billing',
        new Set(billingRequirements.slice(1))
      )
    ).toBe(false)

    expect(
      getRequiredWidgetFeatureSlugs(notepadWidgetMetadata, 'couriers')
    ).toEqual([
      'platform-widgets',
      'platform-widgets-notepad',
      'couriers-widgets',
      'couriers-widgets-notepad',
    ])
  })

  it('requires platform and app gates before enabling Chat', () => {
    const billingRequirements = getRequiredWidgetFeatureSlugs(
      chatWidgetMetadata,
      'billing'
    )

    expect(billingRequirements).toEqual([
      'platform-widgets',
      'platform-widgets-chat',
      'billing-widgets',
      'billing-widgets-chat',
    ])
    expect(
      isWidgetEnabled(
        chatWidgetMetadata,
        'billing',
        new Set(billingRequirements)
      )
    ).toBe(true)
    expect(
      isWidgetEnabled(
        chatWidgetMetadata,
        'billing',
        new Set(
          billingRequirements.filter((slug) => slug !== 'billing-widgets')
        )
      )
    ).toBe(false)
  })

  it('maps invoice host to 876-invoice app slug', () => {
    expect(WIDGET_HOST_APP_SLUGS.invoice).toBe('876-invoice')
    expect(WIDGET_HOST_LABELS.invoice).toBe('876 Invoice')
  })

  it('declares the four exact feature gates for Work in Invoice', () => {
    expect(getWidgetFeatureSlugs(workWidgetMetadata)).toEqual([
      'platform-widgets',
      'platform-widgets-work',
      'invoice-widgets',
      'invoice-widgets-work',
    ])
    expect(
      getRequiredWidgetFeatureSlugs(workWidgetMetadata, 'invoice')
    ).toEqual([
      'platform-widgets',
      'platform-widgets-work',
      'invoice-widgets',
      'invoice-widgets-work',
    ])
  })

  it('declares My Work permission as the Invoice surface access gate', () => {
    expect(workWidgetMetadata.permissions?.invoice).toEqual(['my-work.view'])
  })

  it('resolves Work for Invoice only when every Work gate is enabled', () => {
    const gates = [
      'platform-widgets',
      'platform-widgets-work',
      'invoice-widgets',
      'invoice-widgets-work',
    ]

    expect(resolveEnabledWidgetIds('invoice', new Set(gates))).toEqual(['work'])

    for (const missing of gates) {
      expect(
        resolveEnabledWidgetIds(
          'invoice',
          new Set(gates.filter((slug) => slug !== missing))
        )
      ).toEqual([])
    }
  })

  it('filters enabled Work unless the host permission is effective', () => {
    expect(resolveAccessibleWidgetIds('invoice', ['work'], new Set())).toEqual(
      []
    )
    expect(
      resolveAccessibleWidgetIds('invoice', ['work'], new Set(['my-work.view']))
    ).toEqual(['work'])
  })

  it('keeps widgets without permission requirements accessible', () => {
    expect(
      resolveAccessibleWidgetIds('billing', ['notepad'], new Set<string>())
    ).toEqual(['notepad'])
  })

  it('does not enable Work in Billing before that host is implemented', () => {
    expect(
      isWidgetEnabled(
        workWidgetMetadata,
        'billing',
        new Set([
          'platform-widgets',
          'platform-widgets-work',
          'billing-widgets',
          'billing-widgets-work',
        ])
      )
    ).toBe(false)
  })

  it('resolves enabled Billing panel widgets in catalog order', () => {
    const allBillingGates = [
      'platform-widgets',
      'platform-widgets-notepad',
      'platform-widgets-chat',
      'billing-widgets',
      'billing-widgets-notepad',
      'billing-widgets-chat',
    ]

    expect(
      resolveEnabledWidgetIds('billing', new Set(allBillingGates))
    ).toEqual(['notepad'])
  })

  it('fails closed when group masters or child gates are missing', () => {
    const allBillingGates = [
      'platform-widgets',
      'platform-widgets-notepad',
      'platform-widgets-chat',
      'billing-widgets',
      'billing-widgets-notepad',
      'billing-widgets-chat',
    ]

    expect(
      resolveEnabledWidgetIds(
        'billing',
        new Set(allBillingGates.filter((slug) => slug !== 'platform-widgets'))
      )
    ).toEqual([])

    expect(
      resolveEnabledWidgetIds(
        'billing',
        new Set(allBillingGates.filter((slug) => slug !== 'billing-widgets'))
      )
    ).toEqual([])

    expect(
      resolveEnabledWidgetIds(
        'billing',
        new Set(
          allBillingGates.filter((slug) => slug !== 'billing-widgets-notepad')
        )
      )
    ).toEqual([])

    expect(
      resolveEnabledWidgetIds(
        'billing',
        new Set(
          allBillingGates.filter((slug) => slug !== 'billing-widgets-chat')
        )
      )
    ).toEqual(['notepad'])

    expect(
      isWidgetEnabled(
        notepadWidgetMetadata,
        'enterprise',
        new Set(allBillingGates)
      )
    ).toBe(false)
    expect(
      isWidgetEnabled(notepadWidgetMetadata, '876', new Set(allBillingGates))
    ).toBe(false)
  })

  it('keeps Notepad and Chat unavailable in Invoice', () => {
    const candidateGates = [
      'platform-widgets',
      'platform-widgets-notepad',
      'platform-widgets-chat',
      'invoice-widgets',
      'invoice-widgets-notepad',
      'invoice-widgets-chat',
    ]

    expect(
      isWidgetEnabled(notepadWidgetMetadata, 'invoice', new Set(candidateGates))
    ).toBe(false)
    expect(
      isWidgetEnabled(chatWidgetMetadata, 'invoice', new Set(candidateGates))
    ).toBe(false)
  })
})
