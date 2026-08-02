import { notepadWidgetMetadata } from '@876/widgets'
import { describe, expect, it } from 'vitest'

import {
  CONSOLE_WIDGETS_FEATURE_SLUG,
  getConsoleWidgetStatusFeatureSlug,
  liveLogsWidgetMetadata,
} from './widget-catalog'

describe('Console widget feature controls', () => {
  it('uses the Console parent as the global widget switch', () => {
    expect(CONSOLE_WIDGETS_FEATURE_SLUG).toBe('console_widgets')
  })

  it('resolves the canonical status switch for shared and app-only widgets', () => {
    expect(getConsoleWidgetStatusFeatureSlug(notepadWidgetMetadata)).toBe(
      'platform_widgets_notepad'
    )
    expect(getConsoleWidgetStatusFeatureSlug(liveLogsWidgetMetadata)).toBe(
      'console_widgets_live_logs'
    )
  })
})
