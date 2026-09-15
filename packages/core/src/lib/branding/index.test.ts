import { describe, expect, it } from 'vitest'

import { hexColorSchema } from '../document-templates/schema'
import {
  BRAND_ACCENT_PRESETS,
  BRAND_APPEARANCES,
  BRAND_TOKEN_NAMES,
  DEFAULT_BRANDING,
  SIDEBAR_TONES,
  accentForeground,
  brandTokens,
  brandingSchema,
  contrastRatio,
  relativeLuminance,
  resolveBranding,
} from './index'

const NON_OBJECT_STORED: [unknown][] = [[undefined], [null], ['x']]

function channel(color: string, offset: number): number {
  return Number.parseInt(color.slice(offset, offset + 2), 16)
}

describe('brandingSchema', () => {
  it('accepts the default branding', () => {
    expect(brandingSchema.parse(DEFAULT_BRANDING)).toEqual({
      accentColor: '#2563eb',
      appearance: 'system',
      sidebarTone: 'light',
    })
  })

  it('rejects an unknown appearance', () => {
    expect(
      brandingSchema.safeParse({ ...DEFAULT_BRANDING, appearance: 'sepia' })
        .success
    ).toBe(false)
  })

  it('rejects an unknown sidebar tone', () => {
    expect(
      brandingSchema.safeParse({ ...DEFAULT_BRANDING, sidebarTone: 'blue' })
        .success
    ).toBe(false)
  })

  it('rejects a named accent color', () => {
    expect(
      brandingSchema.safeParse({ ...DEFAULT_BRANDING, accentColor: 'blue' })
        .success
    ).toBe(false)
  })

  it('rejects an extra key', () => {
    expect(
      brandingSchema.safeParse({ ...DEFAULT_BRANDING, logoFileId: 'file_abc' })
        .success
    ).toBe(false)
  })
})

describe('resolveBranding', () => {
  it.each(NON_OBJECT_STORED)(
    'falls back to the default branding for %j',
    (stored) => {
      expect(resolveBranding(stored)).toEqual(DEFAULT_BRANDING)
    }
  )

  it('resolves a stored brand and normalizes the accent color', () => {
    expect(
      resolveBranding({
        accentColor: '#E11D48',
        appearance: 'dark',
        sidebarTone: 'dark',
      })
    ).toEqual({
      accentColor: '#e11d48',
      appearance: 'dark',
      sidebarTone: 'dark',
    })
  })

  it('degrades only the malformed field', () => {
    expect(
      resolveBranding({ accentColor: 'nope', appearance: 'dark' })
    ).toEqual({
      accentColor: '#2563eb',
      appearance: 'dark',
      sidebarTone: 'light',
    })
  })
})

describe('BRAND_ACCENT_PRESETS', () => {
  it('declares a unique key per preset', () => {
    const keys = BRAND_ACCENT_PRESETS.map((preset) => preset.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('declares a unique color per preset', () => {
    const colors = BRAND_ACCENT_PRESETS.map((preset) => preset.color)
    expect(new Set(colors).size).toBe(colors.length)
  })

  it.each([...BRAND_ACCENT_PRESETS])(
    'declares a valid hex color for $key',
    (preset) => {
      expect(hexColorSchema.safeParse(preset.color).success).toBe(true)
      expect(hexColorSchema.parse(preset.color)).toBe(preset.color)
    }
  )

  it.each([...BRAND_ACCENT_PRESETS])('keeps $key away from green', (preset) => {
    const red = channel(preset.color, 1)
    const green = channel(preset.color, 3)
    const blue = channel(preset.color, 5)
    expect(green > red + 40 && green > blue + 40).toBe(false)
  })
})

describe('contrast helpers', () => {
  it('scores white against black at the WCAG maximum', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5)
  })

  it('scores a color against itself as the minimum ratio', () => {
    expect(contrastRatio('#2563eb', '#2563eb')).toBe(1)
  })

  it('is symmetric in its arguments', () => {
    expect(contrastRatio('#0f172a', '#facc15')).toBe(
      contrastRatio('#facc15', '#0f172a')
    )
  })

  it('computes zero relative luminance for black', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
  })

  it('computes full relative luminance for white', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
  })

  it('picks white text on the default blue accent', () => {
    expect(accentForeground('#2563eb')).toBe('#ffffff')
  })

  it('picks near-black text on a pale yellow accent', () => {
    expect(accentForeground('#fde047')).toBe('#111827')
  })
})

describe('brand tokens', () => {
  it('returns exactly the three brand token values', () => {
    expect(brandTokens(DEFAULT_BRANDING)).toEqual({
      '--brand-accent': '#2563eb',
      '--brand-accent-foreground': '#ffffff',
      '--brand-accent-subtle': 'color-mix(in oklab, #2563eb 12%, transparent)',
    })
  })

  it('returns one value per declared token name', () => {
    expect(Object.keys(brandTokens(DEFAULT_BRANDING))).toEqual([
      ...BRAND_TOKEN_NAMES,
    ])
  })

  it('offers system, light and dark appearances', () => {
    expect([...BRAND_APPEARANCES]).toEqual(['system', 'light', 'dark'])
  })

  it('offers light and dark sidebar tones', () => {
    expect([...SIDEBAR_TONES]).toEqual(['light', 'dark'])
  })
})
