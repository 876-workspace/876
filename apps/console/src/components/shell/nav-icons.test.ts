import { describe, expect, it } from 'vitest'

import {
  NAV_ICON_COLORS,
  NAV_ICONS,
  resolveNavIcon,
  resolveNavIconColor,
} from './nav-icons'

describe('resolveNavIconColor', () => {
  it('paints platform overview concepts blue', () => {
    for (const key of ['dashboard', 'overview', 'storage']) {
      expect(resolveNavIconColor(key)).toContain('text-blue-500')
    }
  })

  it('paints people concepts amber', () => {
    for (const key of [
      'users',
      'customers',
      'subscribers',
      'teams',
      'organizations',
      'reports',
    ]) {
      expect(resolveNavIconColor(key)).toContain('text-amber-500')
    }
  })

  it('paints intake concepts cyan', () => {
    for (const key of ['support', 'requests', 'forms']) {
      expect(resolveNavIconColor(key)).toContain('text-cyan-500')
    }
  })

  it('paints trust concepts rose', () => {
    for (const key of ['security', 'keys', 'roles', 'audit']) {
      expect(resolveNavIconColor(key)).toContain('text-rose-500')
    }
  })

  it('paints extensibility concepts emerald', () => {
    for (const key of ['widgets', 'modules', 'features']) {
      expect(resolveNavIconColor(key)).toContain('text-emerald-500')
    }
  })

  it('paints platform administration slate', () => {
    for (const key of ['settings', 'provisioning', 'operations']) {
      expect(resolveNavIconColor(key)).toContain('text-slate-500')
    }
  })

  it('paints tracking concepts indigo and planning violet', () => {
    for (const key of ['projects', 'folder', 'issues']) {
      expect(resolveNavIconColor(key)).toContain('text-indigo-500')
    }
    expect(resolveNavIconColor('board')).toContain('text-violet-500')
  })

  it('paints taxonomy concepts fuchsia', () => {
    for (const key of ['labels', 'categories']) {
      expect(resolveNavIconColor(key)).toContain('text-fuchsia-500')
    }
  })

  it('paints money concepts teal and logistics orange', () => {
    for (const key of ['billing', 'payments', 'plans', 'banking']) {
      expect(resolveNavIconColor(key)).toContain('text-teal-500')
    }
    for (const key of ['items', 'packages', 'warehouses']) {
      expect(resolveNavIconColor(key)).toContain('text-orange-500')
    }
  })

  it('paints notifications sky and branches lime', () => {
    expect(resolveNavIconColor('notifications')).toContain('text-sky-500')
    expect(resolveNavIconColor('branches')).toContain('text-lime-600')
  })

  it('falls back to muted for an icon key with no declared color', () => {
    expect(resolveNavIconColor('no-such-icon')).toBe('text-muted-foreground')
    expect(resolveNavIconColor('')).toBe('text-muted-foreground')
  })

  it('carries a dark-mode variant on every declared color', () => {
    for (const color of Object.values(NAV_ICON_COLORS)) {
      expect(color).toContain('dark:text-')
    }
  })

  it('declares a color for every registered icon', () => {
    for (const key of Object.keys(NAV_ICONS)) {
      expect(NAV_ICON_COLORS[key]).toBeDefined()
    }
  })

  it('colors only registered icons, leaving no dead entries', () => {
    for (const key of Object.keys(NAV_ICON_COLORS)) {
      expect(NAV_ICONS[key]).toBeDefined()
    }
  })
})

describe('resolveNavIcon', () => {
  it('resolves a known icon key to its component', () => {
    expect(resolveNavIcon('issues')).toBe(NAV_ICONS.issues)
  })

  it('falls back to the neutral group icon for an unknown key', () => {
    expect(resolveNavIcon('no-such-icon')).toBe(resolveNavIcon('widgets'))
  })
})
