import { cn } from '../lib/utils'

type OrgAvatarSize = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<OrgAvatarSize, string> = {
  sm: 'size-6 rounded-md text-[0.5625rem]',
  md: 'size-10 rounded-xl text-xs',
  lg: 'size-12 rounded-xl text-sm',
}

/**
 * Deterministic brand-tinted swatches picked by a stable hash of the org name
 * so each organization keeps a consistent color across the app.
 * Uses soft tints (15% fill) with matching foreground text — no gradients,
 * no hard-coded white — so the avatar adapts to light and dark mode naturally.
 */
const SWATCHES = [
  {
    bg: 'color-mix(in oklab, var(--876-blue) 15%, transparent)',
    fg: 'var(--876-blue)',
  },
  {
    bg: 'color-mix(in oklab, var(--876-gold) 20%, transparent)',
    fg: 'oklch(0.52 0.16 75)',
  },
  {
    bg: 'color-mix(in oklab, var(--876-red) 15%, transparent)',
    fg: 'var(--876-red)',
  },
  {
    bg: 'color-mix(in oklab, var(--876-purple) 15%, transparent)',
    fg: 'var(--876-purple)',
  },
]

function hashIndex(value: string, modulo: number): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % modulo
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || '—'
  )
}

/**
 * An organization's avatar. Renders the provided `src` image when available,
 * otherwise a deterministic tinted monogram derived from the name. Shared
 * across Console and the consumer app.
 */
export function OrgAvatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name?: string | null
  src?: string | null
  size?: OrgAvatarSize
  className?: string
}) {
  const displayName = name ?? '?'
  const sizeClass = SIZE_CLASSES[size]

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- org logos are arbitrary external URLs at small sizes; next/image optimization isn't warranted here
      <img
        src={src}
        alt=""
        className={cn(
          'border-876-surface-border shrink-0 border object-cover',
          sizeClass,
          className
        )}
      />
    )
  }

  const swatch = SWATCHES[hashIndex(displayName, SWATCHES.length)]

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center font-semibold tracking-tight',
        sizeClass,
        className
      )}
      style={{
        backgroundColor: swatch.bg,
        color: swatch.fg,
      }}
    >
      {initialsOf(displayName)}
    </span>
  )
}
