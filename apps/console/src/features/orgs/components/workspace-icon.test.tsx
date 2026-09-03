import { describe, expect, it } from 'vitest'

import { NAV_ICONS } from '@/components/shell/nav-icons'
import { WORKSPACE_ICON_COLORS } from './workspace-icon'
import type { WorkspaceIconKey } from '../app-workspaces'

const WORKSPACE_ICON_KEYS = Object.keys(
  WORKSPACE_ICON_COLORS
) as WorkspaceIconKey[]

describe('workspace section icons', () => {
  // A workspace renders in the main sidebar, so its section icons resolve
  // through the shell's registry. `resolveNavIcon` falls back to a generic
  // square for an unknown key, so a section this registry does not know
  // degrades to an unreadable rail instead of failing anything.
  it('declares every workspace icon key in the shell registry', () => {
    const missing = WORKSPACE_ICON_KEYS.filter((key) => !(key in NAV_ICONS))

    expect(missing).toEqual([])
  })

  it('gives every workspace icon key an accent colour', () => {
    for (const key of WORKSPACE_ICON_KEYS) {
      expect(WORKSPACE_ICON_COLORS[key]).toMatch(/^text-/)
    }
  })
})
