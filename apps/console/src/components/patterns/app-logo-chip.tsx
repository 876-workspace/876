import Image from 'next/image'
import { cn } from '@876/core/utils'

const APP_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
] as const

export function getAppColorClass(appKey: string): string {
  const normalizedKey = appKey.trim().toLowerCase()
  let hash = 0

  for (let i = 0; i < normalizedKey.length; i++)
    hash = (hash * 31 + normalizedKey.charCodeAt(i)) | 0

  return APP_COLORS[Math.abs(hash) % APP_COLORS.length]!
}

type AppLogoChipSize = 'sm' | 'md'

const APP_LOGO_SIZES: Record<
  AppLogoChipSize,
  { className: string; pixels: number }
> = {
  sm: { className: 'size-5 rounded-sm text-[10px]', pixels: 20 },
  md: { className: 'size-7 rounded-md text-[11px]', pixels: 28 },
}

type AppLogoChipProps = {
  appId?: string | null
  slug?: string | null
  name: string
  logoUrl?: string | null
  size?: AppLogoChipSize
  className?: string
}

/**
 * App identity used in data tables and other compact Console surfaces.
 *
 * Apps without a logo receive a deterministic color derived from their stable
 * slug (falling back to app ID/name), so the same app keeps the same color on
 * every surface and across renders.
 */
export function AppLogoChip({
  appId,
  slug,
  name,
  logoUrl,
  size = 'sm',
  className,
}: AppLogoChipProps) {
  const styles = APP_LOGO_SIZES[size]
  const appKey = slug || appId || name
  const initial = name.trim().charAt(0).toUpperCase() || 'A'

  if (logoUrl)
    return (
      <Image
        src={logoUrl}
        alt={name}
        title={name}
        width={styles.pixels}
        height={styles.pixels}
        unoptimized
        className={cn('object-cover', styles.className, className)}
      />
    )

  return (
    <span
      title={name}
      aria-label={name}
      className={cn(
        'inline-flex items-center justify-center font-semibold text-white',
        styles.className,
        getAppColorClass(appKey),
        className
      )}
    >
      {initial}
    </span>
  )
}
