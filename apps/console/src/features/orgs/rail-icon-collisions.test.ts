import { describe, expect, it } from 'vitest'

import { APP_WORKSPACES } from './app-workspaces'
import { NAV_ICONS, resolveNavIcon } from '@/components/shell/nav-icons'

/**
 * Two entries in one rail resolving to the same glyph is the defect this run
 * fixed — Projects and Issues both drew a clipboard, Board and Labels both drew
 * a card grid. These assertions span the shell's icon registry and the feature
 * modules that declare the rails, so they live on the feature side: the shell
 * may not import a feature, but a feature may read the shell.
 */

describe('workspace rail icons', () => {
  it('registers an icon component for every icon key any workspace rail declares', () => {
    const declared = new Set(
      APP_WORKSPACES.flatMap((workspace) =>
        workspace.sections.map((section) => section.iconKey)
      )
    )

    expect(declared.size).toBeGreaterThan(0)

    const unregistered = Array.from(declared)
      .filter((key) => NAV_ICONS[key] === undefined)
      .sort()

    expect(unregistered).toEqual([])
  })

  it('resolves distinct icon components for every workspace section rail', () => {
    for (const workspace of APP_WORKSPACES) {
      const icons = workspace.sections.map((section) =>
        resolveNavIcon(section.iconKey)
      )

      expect(new Set(icons).size).toBe(icons.length)
    }
  })
})
