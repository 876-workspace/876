import { describe, expect, it } from 'vitest'

import {
  chatWidgetMetadata,
  getRequiredWidgetFeatureSlugs,
  getWidgetFeatureSlugs,
  isWidgetEnabled,
  isWidgetsDataOwner,
  notepadWidgetMetadata,
  resolveEnabledWidgetIds,
  WIDGET_HOST_APP_SLUGS,
  WIDGET_HOST_LABELS,
  widgetCatalog,
} from './catalog'

describe('shared widget catalog', () => {
  it('exports portable widgets only', () => {
    expect(widgetCatalog.map((widget) => widget.id)).toEqual([
      'notepad',
      'chat',
    ])
    expect(widgetCatalog.map((widget) => widget.id)).not.toContain('live_logs')
  })

  it('marks notepad as widgets-owned shared content', () => {
    expect(notepadWidgetMetadata.distribution).toBe('shared')
    expect(notepadWidgetMetadata.dataOwner).toBe('widgets')
    expect(isWidgetsDataOwner(notepadWidgetMetadata)).toBe(true)
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

    // Missing platform master
    expect(
      resolveEnabledWidgetIds(
        'billing',
        new Set(allBillingGates.filter((slug) => slug !== 'platform-widgets'))
      )
    ).toEqual([])

    // Missing billing master
    expect(
      resolveEnabledWidgetIds(
        'billing',
        new Set(allBillingGates.filter((slug) => slug !== 'billing-widgets'))
      )
    ).toEqual([])

    // Missing notepad child gate
    expect(
      resolveEnabledWidgetIds(
        'billing',
        new Set(
          allBillingGates.filter((slug) => slug !== 'billing-widgets-notepad')
        )
      )
    ).toEqual([])

    // Missing chat child gate
    expect(
      resolveEnabledWidgetIds(
        'billing',
        new Set(
          allBillingGates.filter((slug) => slug !== 'billing-widgets-chat')
        )
      )
    ).toEqual(['notepad'])

    // isWidgetEnabled fails closed on unsupported or unimplemented hosts
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
    expect(
      isWidgetEnabled(
        notepadWidgetMetadata,
        'invoice',
        new Set(allBillingGates)
      )
    ).toBe(false)
  })

  it('returns empty list for invoice even when invoice-widgets and candidate gates are present', () => {
    const candidateGates = [
      'platform-widgets',
      'platform-widgets-notepad',
      'platform-widgets-chat',
      'invoice-widgets',
      'invoice-widgets-notepad',
      'invoice-widgets-chat',
    ]

    expect(resolveEnabledWidgetIds('invoice', new Set(candidateGates))).toEqual(
      []
    )
    expect(
      isWidgetEnabled(notepadWidgetMetadata, 'invoice', new Set(candidateGates))
    ).toBe(false)
    expect(
      isWidgetEnabled(chatWidgetMetadata, 'invoice', new Set(candidateGates))
    ).toBe(false)
  })
})
