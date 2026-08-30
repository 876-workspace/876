'use client'

import { Avatar, AvatarFallback, AvatarImage } from './avatar'
import { cn } from '../lib/utils'

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
]

function initialsOf(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  )
}

function avatarColor(name: string): string {
  let hash = 0
  for (let index = 0; index < name.length; index++) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!
}

/**
 * Avatar for a customer or member: their picture when one exists, otherwise a
 * monogram with a deterministic tint derived from a hash of their name, so the
 * same person keeps the same color everywhere.
 *
 * `src` is optional because most parties in the registry are hand-entered and
 * have no picture at all. The monogram is the fallback in both senses — it is
 * what renders with no `src`, and what Base UI swaps back to if the image
 * fails to load.
 */
export function CustomerAvatar({
  name,
  src,
  size = 'sm',
  shape,
  className,
}: {
  name: string
  /** Picture URL. Falls back to the monogram when absent or broken. */
  src?: string | null
  size?: 'sm' | 'lg'
  /** Shape: 'circle' for individuals, 'square' for business entities. Defaults to 'circle' for lg and 'rounded' for sm if omitted. */
  shape?: 'circle' | 'square' | 'rounded'
  className?: string
}) {
  const colorClass = avatarColor(name)
  const initials = initialsOf(name)

  const isSquare = shape === 'square' || shape === 'rounded'

  if (size === 'lg') {
    const radiusClass = isSquare
      ? 'rounded-2xl after:rounded-2xl'
      : 'rounded-full after:rounded-full'

    return (
      <Avatar
        size="lg"
        className={cn(
          'ring-876-surface size-14 shrink-0 text-lg shadow-sm ring-2 sm:size-16 sm:text-xl',
          radiusClass,
          className
        )}
      >
        {src ? <AvatarImage src={src} alt="" /> : null}
        <AvatarFallback className={colorClass}>{initials}</AvatarFallback>
      </Avatar>
    )
  }

  const radiusClass =
    shape === 'circle'
      ? 'rounded-full after:rounded-full'
      : 'rounded-md after:rounded-md'

  return (
    <Avatar size="sm" className={cn('size-6 shrink-0', radiusClass, className)}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback className={cn('text-[0.5625rem]', colorClass)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
