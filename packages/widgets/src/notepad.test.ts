import { describe, expect, it } from 'vitest'

import {
  getRequiredWidgetFeatureSlugs,
  getWidgetFeatureSlugs,
  isWidgetEnabled,
  isWidgetsDataOwner,
  notepadWidgetMetadata,
  widgetCatalog,
} from './catalog'

describe('Notepad widget catalog', () => {
  it('exports portable widgets only', () => {
    expect(widgetCatalog.map((widget) => widget.id)).toEqual(['notepad'])
    expect(widgetCatalog.map((widget) => widget.id)).not.toContain('live_logs')
  })

  it('marks notepad as widgets-owned shared content', () => {
    expect(notepadWidgetMetadata.distribution).toBe('shared')
    expect(notepadWidgetMetadata.dataOwner).toBe('widgets')
    expect(isWidgetsDataOwner(notepadWidgetMetadata)).toBe(true)
  })

  it('derives every host gate from the typed widget definition', () => {
    expect(getWidgetFeatureSlugs(notepadWidgetMetadata)).toEqual([
      'platform_widgets',
      'platform_widgets_notepad',
      'console_widgets',
      'console_widgets_notepad',
      'billing_widgets',
      'billing_widgets_notepad',
      'couriers_widgets',
      'couriers_widgets_notepad',
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
      'platform_widgets',
      'platform_widgets_notepad',
      'couriers_widgets',
      'couriers_widgets_notepad',
    ])
  })
})
