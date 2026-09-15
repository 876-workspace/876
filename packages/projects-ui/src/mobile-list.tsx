import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@876/core/utils'
import { ChevronRight } from '@876/ui/icons'

/**
 * Phone lists read like a messaging app: full-bleed rows running down the
 * screen, a coloured avatar leading each row, and hairline separators inset
 * past the avatar. No card surface — the list is the page.
 */
export function MobileList({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <ul
      className={cn(
        '-mx-4 sm:hidden [&>li+li_[data-cell-content]]:border-t',
        className
      )}
    >
      {children}
    </ul>
  )
}

export function MobileListEmpty({ children }: { children: ReactNode }) {
  return (
    <li className="text-muted-foreground px-4 py-12 text-center text-[0.9375rem]">
      {children}
    </li>
  )
}

const AVATAR_TONES = [
  'bg-sky-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-emerald-500',
  'bg-indigo-500',
  'bg-orange-500',
  'bg-teal-500',
] as const

/** A stable colour per seed, so the same project always wears the same colour. */
export function avatarTone(seed: string): string {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}

export function MobileListCell({
  href,
  label,
  avatar,
  avatarClassName,
  avatarStyle,
  title,
  subtitle,
  meta,
  showDisclosure = true,
}: {
  href?: string
  label?: string
  avatar: ReactNode
  avatarClassName?: string
  avatarStyle?: CSSProperties
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  showDisclosure?: boolean
}) {
  const body = (
    <>
      <span
        aria-hidden="true"
        style={avatarStyle}
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-[0.875rem] text-[0.9375rem] font-semibold text-white shadow-sm',
          avatarClassName
        )}
      >
        {avatar}
      </span>
      <div
        data-cell-content
        className="border-border/60 flex min-w-0 flex-1 flex-col justify-center self-stretch py-3 pr-4"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-[1rem] leading-5 font-semibold">
            {title}
          </p>
          {meta ? (
            <span className="text-muted-foreground shrink-0 text-[0.8125rem] tabular-nums">
              {meta}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className="text-muted-foreground mt-0.5 truncate text-[0.9375rem] leading-5">
            {subtitle}
          </p>
        ) : null}
      </div>
      {href && showDisclosure ? (
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground/40 mr-3 size-5 shrink-0"
        />
      ) : null}
    </>
  )
  const rowClassName = 'flex min-h-[4.5rem] items-center gap-3 pl-4'

  return (
    <li>
      {href ? (
        <Link
          href={href}
          aria-label={label}
          className={cn(
            rowClassName,
            'active:bg-muted/70 transition-colors focus-visible:outline-hidden'
          )}
        >
          {body}
        </Link>
      ) : (
        <div className={rowClassName}>{body}</div>
      )}
    </li>
  )
}
