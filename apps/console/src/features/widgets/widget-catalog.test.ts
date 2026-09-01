import { chatWidgetMetadata, notepadWidgetMetadata } from '@876/widgets'
import { describe, expect, it } from 'vitest'

import {
  CONSOLE_WIDGETS_FEATURE_SLUG,
  getConsoleWidgetStatusFeatureSlug,
  liveLogsWidgetMetadata,
} from './widget-catalog'

describe('Console widget feature controls', () => {
  it('uses the Console parent as the global widget switch', () => {
    expect(CONSOLE_WIDGETS_FEATURE_SLUG).toBe('console-widgets')
  })

  it('resolves the canonical status switch for shared and app-only widgets', () => {
    expect(getConsoleWidgetStatusFeatureSlug(notepadWidgetMetadata)).toBe(
      'platform-widgets-notepad'
    )
    expect(getConsoleWidgetStatusFeatureSlug(chatWidgetMetadata)).toBe(
      'platform-widgets-chat'
    )
    expect(getConsoleWidgetStatusFeatureSlug(liveLogsWidgetMetadata)).toBe(
      'console-widgets-live-logs'
    )
  })
})
