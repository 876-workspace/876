import { describe, expect, it } from 'vitest'

import { resolveNavIcon } from '@/components/shell/nav-icons'
import { appDetailSections } from './app-detail-nav'

/**
 * Two sections in one rail resolving to the same glyph is the defect this run
 * fixed. The assertion lives beside the module that declares the sections; the
 * shell may not import a feature, but a feature may read the shell's registry.
 */

describe('app detail rail icons', () => {
  it('resolves distinct icon components for every app detail section rail', () => {
    for (const kind of ['product', 'platform', 'internal'] as const) {
      const sections = appDetailSections(kind)
      const icons = sections.map((section) => resolveNavIcon(section.icon))

      expect(new Set(icons).size).toBe(icons.length)
    }
  })
})
