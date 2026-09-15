import { z } from 'zod'

import { hexColorSchema } from '../document-templates/schema'

/**
 * Organization branding for the finance surfaces (Invoice, Billing, Couriers
 * and their customer portals), modelled on Zoho's Settings → Branding: one
 * accent color and an appearance choice that every finance app and every
 * customer-facing document inherits. The logo stays on the Core organization.
 */
export const BRAND_APPEARANCES = ['system', 'light', 'dark'] as const
export const SIDEBAR_TONES = ['light', 'dark'] as const

export type BrandAppearance = (typeof BRAND_APPEARANCES)[number]
export type SidebarTone = (typeof SIDEBAR_TONES)[number]

/**
 * Preset accents. Green is deliberately absent: the accent is destined to fill
 * primary buttons once app theming lands, and green is reserved for status.
 */
export const BRAND_ACCENT_PRESETS = [
  { key: 'blue', label: 'Blue', color: '#2563eb' },
  { key: 'indigo', label: 'Indigo', color: '#4f46e5' },
  { key: 'violet', label: 'Violet', color: '#7c3aed' },
  { key: 'rose', label: 'Rose', color: '#e11d48' },
  { key: 'orange', label: 'Orange', color: '#ea580c' },
  { key: 'amber', label: 'Amber', color: '#d97706' },
  { key: 'teal', label: 'Teal', color: '#0d9488' },
  { key: 'slate', label: 'Slate', color: '#475569' },
] as const

export const DEFAULT_BRANDING = {
  accentColor: '#2563eb',
  appearance: 'system',
  sidebarTone: 'light',
} as const satisfies Branding

export const brandingSchema = z.strictObject({
  accentColor: hexColorSchema,
  appearance: z.enum(BRAND_APPEARANCES),
  sidebarTone: z.enum(SIDEBAR_TONES),
})

export type Branding = z.infer<typeof brandingSchema>

export const brandingUpdateSchema = brandingSchema.partial()

export type BrandingUpdate = z.infer<typeof brandingUpdateSchema>

/** Resolves a stored row, degrading each malformed field to its default. */
export function resolveBranding(stored: unknown): Branding {
  if (typeof stored !== 'object' || stored === null) return DEFAULT_BRANDING

  const record = stored as Record<string, unknown>
  const shape = brandingSchema.shape

  const accent = shape.accentColor.safeParse(record.accentColor)
  const appearance = shape.appearance.safeParse(record.appearance)
  const sidebarTone = shape.sidebarTone.safeParse(record.sidebarTone)

  return {
    accentColor: accent.success ? accent.data : DEFAULT_BRANDING.accentColor,
    appearance: appearance.success
      ? appearance.data
      : DEFAULT_BRANDING.appearance,
    sidebarTone: sidebarTone.success
      ? sidebarTone.data
      : DEFAULT_BRANDING.sidebarTone,
  }
}

function channel(hex: string, offset: number): number {
  return Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
}

/** WCAG 2.x relative luminance of a `#rrggbb` color. */
export function relativeLuminance(hex: string): number {
  const linear = (value: number) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4

  return (
    0.2126 * linear(channel(hex, 1)) +
    0.7152 * linear(channel(hex, 3)) +
    0.0722 * linear(channel(hex, 5))
  )
}

/** WCAG contrast ratio between two `#rrggbb` colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x
  )
  return (light + 0.05) / (dark + 0.05)
}

const FOREGROUND_LIGHT = '#ffffff'
const FOREGROUND_DARK = '#111827'

/** Text color readable on the accent: whichever of white or near-black contrasts more. */
export function accentForeground(accentColor: string): string {
  return contrastRatio(accentColor, FOREGROUND_LIGHT) >=
    contrastRatio(accentColor, FOREGROUND_DARK)
    ? FOREGROUND_LIGHT
    : FOREGROUND_DARK
}

/**
 * The CSS custom properties a surface sets to apply an organization's brand.
 * This is the theming contract: components read `var(--brand-*)`, never an
 * organization's stored value, so a stored brand can change without a
 * component knowing where it came from.
 */
export const BRAND_TOKEN_NAMES = [
  '--brand-accent',
  '--brand-accent-foreground',
  '--brand-accent-subtle',
] as const

export type BrandTokenName = (typeof BRAND_TOKEN_NAMES)[number]

export function brandTokens(
  branding: Branding
): Record<BrandTokenName, string> {
  return {
    '--brand-accent': branding.accentColor,
    '--brand-accent-foreground': accentForeground(branding.accentColor),
    '--brand-accent-subtle': `color-mix(in oklab, ${branding.accentColor} 12%, transparent)`,
  }
}
