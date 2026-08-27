import * as React from 'react'

import {
  AlertCircle,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  ClipboardList,
  CreditCard,
  Database,
  Flag,
  Globe,
  Hash,
  Lock,
  Mail,
  MapPin,
  PaintBrush,
  Phone,
  ReceiptText,
  Settings,
  Shield,
  Sparkles,
  Star,
  Terminal,
  TrendingUp,
  Users,
} from './icons'

type IconProps = React.SVGProps<SVGSVGElement>

/**
 * Glyphs the platform's Heroicons set does not carry.
 *
 * The category picker needs a handful of concrete, recognisable objects — a bug
 * above all, because "Bugs" is the category everyone reaches for first — and
 * Heroicons is deliberately abstract, so it has none of them. Drawing four
 * outline glyphs here is cheaper and far more contained than adding a second
 * icon library to the platform for one picker: `@876/ui/icons` stays the single
 * source of icons, and this catalog stays closed.
 *
 * Each is drawn on Heroicons' own 24×24 grid with `stroke-width: 1.5` and
 * `currentColor`, so it sits beside a Heroicon at the same optical weight.
 */

/** A ladybug, viewed from above — the universal "bug report" mark. */
function BugGlyph(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 7.5c3.04 0 5.5 2.8 5.5 6.25S15.04 20.5 12 20.5s-5.5-2.8-5.5-6.75S8.96 7.5 12 7.5Z" />
      <path d="M12 7.5V20.5" />
      <path d="M9.2 6.6a3.2 3.2 0 0 1 5.6 0" />
      <path d="M6.6 10.2 3.5 8.6M17.4 10.2l3.1-1.6M6.2 14H3M17.8 14H21M6.7 17.9 4 19.8M17.3 17.9 20 19.8" />
      <path d="M9.4 11.6h.01M14.6 11.6h.01M9 15.6h.01M15 15.6h.01" />
    </svg>
  )
}

/** A wrench — maintenance, repairs, technical work. */
function WrenchGlyph(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M15.6 3.6a5.25 5.25 0 0 0-6.4 6.75L3.9 15.65a1.9 1.9 0 0 0 2.7 2.7l5.3-5.3a5.25 5.25 0 0 0 6.75-6.4l-2.9 2.9-2.4-.65-.65-2.4 2.9-2.9Z" />
      <path d="M6.1 16.6h.01" />
    </svg>
  )
}

/** A delivery truck — shipping, logistics, fulfilment. */
function TruckGlyph(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M2.75 6.25A1.5 1.5 0 0 1 4.25 4.75h8.5a1.5 1.5 0 0 1 1.5 1.5v9.5h-11.5v-9.5Z" />
      <path d="M14.25 9.25h3.1a1.5 1.5 0 0 1 1.28.72l1.9 3.13c.14.23.22.5.22.78v1.87h-6.5v-6.5Z" />
      <path d="M2.75 15.75h1.4M9.85 15.75h4.4M19.85 15.75h1.4" />
      <path d="M7 15.75a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM19.5 15.75a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0Z" />
    </svg>
  )
}

/** A lightbulb — ideas, suggestions, feature requests. */
function LightbulbGlyph(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9.5 17.5a5.75 5.75 0 1 1 5 0v1.25a1.5 1.5 0 0 1-1.5 1.5h-2a1.5 1.5 0 0 1-1.5-1.5V17.5Z" />
      <path d="M9.75 17.5h4.5" />
    </svg>
  )
}

/**
 * The category icon catalog.
 *
 * A **closed allowlist**: a category stores one of these keys as a plain string,
 * never a component and never an arbitrary icon name. That is what lets the
 * value cross the RSC boundary, survive in the database, and fail safe — an
 * unknown key renders the fallback rather than crashing a settings page, which
 * is the same discipline the settings-nav registry uses
 * (`.claude/rules/module-settings.md`).
 *
 * Keys are permanent identifiers. Renaming one orphans every category that
 * stored it, so add new entries rather than re-spelling existing ones.
 */
export const CATEGORY_ICONS = {
  tag: Hash,
  bug: BugGlyph,
  wrench: WrenchGlyph,
  lightbulb: LightbulbGlyph,
  truck: TruckGlyph,
  'life-ring': Shield,
  billing: CreditCard,
  receipt: ReceiptText,
  chart: BarChart3,
  trending: TrendingUp,
  users: Users,
  building: Building2,
  mail: Mail,
  phone: Phone,
  bell: Bell,
  calendar: Calendar,
  clipboard: ClipboardList,
  flag: Flag,
  star: Star,
  sparkles: Sparkles,
  alert: AlertCircle,
  lock: Lock,
  globe: Globe,
  'map-pin': MapPin,
  database: Database,
  terminal: Terminal,
  palette: PaintBrush,
  settings: Settings,
} as const satisfies Record<string, React.ComponentType<IconProps>>

export type CategoryIconKey = keyof typeof CATEGORY_ICONS

/** Every key, in catalog order — the picker's source of truth. */
export const CATEGORY_ICON_KEYS = Object.keys(
  CATEGORY_ICONS
) as CategoryIconKey[]

/** Narrows an untrusted stored value to a key this build still knows. */
export function isCategoryIconKey(value: unknown): value is CategoryIconKey {
  // `Object.hasOwn`, not `in`: `in` walks the prototype chain, so a stored value
  // of "toString" or "constructor" would pass and then render `Object.prototype`
  // as if it were a component.
  return typeof value === 'string' && Object.hasOwn(CATEGORY_ICONS, value)
}

/**
 * Renders a category's icon by key.
 *
 * `name` is deliberately typed loose: it arrives from the database, where a key
 * written by an older build may no longer exist. Falling back to `tag` keeps a
 * renamed or removed glyph from taking a whole settings page down with it.
 */
export function CategoryIcon({
  name,
  ...props
}: Omit<IconProps, 'name'> & { name: string | null | undefined }) {
  // `Omit`, because `React.SVGProps` already declares its own `name?: string`.
  // A plain intersection silently narrows this back to `string | undefined`, so
  // the `null` a database column actually yields would not type-check at the
  // call site even though the runtime handles it.
  const Icon = isCategoryIconKey(name)
    ? CATEGORY_ICONS[name]
    : CATEGORY_ICONS.tag
  return <Icon {...props} />
}
