import { cn } from '../lib/utils'

/**
 * Vertical flag colors per ISO 3166-1 alpha-2 country code, ordered top to
 * bottom. Simplified to a few solid colors so they stay readable on a slim
 * stripe; every color renders at equal size. Jamaica is the platform's home
 * market and the fallback.
 */
const FLAG_COLORS: Record<string, string[]> = {
  JM: ['#009B3A', '#FED100', '#1A1A1A'],
  TT: ['#DA1A35', '#FFFFFF', '#1A1A1A'],
  BB: ['#00267F', '#FFC726', '#00267F'],
  BS: ['#00778B', '#FFC72C', '#1A1A1A'],
  GY: ['#009E49', '#FFD100', '#CE1126'],
  HT: ['#00209F', '#D21034'],
  DO: ['#002D62', '#FFFFFF', '#CE1126'],
  CU: ['#002A8F', '#FFFFFF', '#CF142B'],
  GD: ['#CE1126', '#FCD116', '#007A5E'],
  US: ['#3C3B6E', '#FFFFFF', '#B22234'],
  GB: ['#012169', '#FFFFFF', '#C8102E'],
  CA: ['#D80621', '#FFFFFF', '#D80621'],
}

/** Flag colors for a country code, falling back to Jamaica. */
export function getFlagColors(countryCode?: string | null): string[] {
  return FLAG_COLORS[(countryCode ?? 'JM').toUpperCase()] ?? FLAG_COLORS.JM
}

/**
 * The ID-card edge stripe: a slim vertical band of the user's country flag
 * colors, rendered alongside their avatar so an identity always carries its
 * nationality marker. Colors split the stripe evenly; `thickness` (px) sets
 * the stripe width. Decorative only — hidden from assistive tech.
 */
export function FlagStripe({
  countryCode,
  thickness = 6,
  className,
}: {
  countryCode?: string | null
  /** Stripe width in pixels. */
  thickness?: number
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      style={{ width: thickness }}
      className={cn(
        'flex shrink-0 flex-col self-stretch overflow-hidden rounded-full shadow-sm dark:ring-1 dark:ring-white/15',
        className
      )}
    >
      {getFlagColors(countryCode).map((color, index) => (
        <span
          key={index}
          className="w-full flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  )
}
