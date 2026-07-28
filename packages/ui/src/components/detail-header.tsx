'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

/**
 * Detail-page identity band. It has no surface of its own — the entity name
 * and tabs sit straight on the slate canvas, so the band never reads as a
 * white slab and never has a right edge that lands wherever the widget bar
 * happens to leave it. The shell still carries an opaque canvas fill because
 * it is the element that sticks, and page content must scroll behind it
 * rather than through it.
 *
 * Pinned, the band condenses: the identity zone drops away and the tab strip
 * stays, so a long detail page does not scroll under a full-height header.
 * A sentinel above the shell drives it through an IntersectionObserver — no
 * scroll listener, so nothing runs per frame while scrolling. `condensedTitle`
 * is the compact stand-in for the entity name; omit it and only the tabs
 * remain.
 */
const DetailHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { condensedTitle?: React.ReactNode }
>(({ className, children, condensedTitle, ...props }, ref) => {
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = React.useState(false)

  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => setPinned(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      <div
        ref={ref}
        data-condensed={pinned ? 'true' : undefined}
        className={cn(
          '876-detail-header-shell sm:sticky sm:top-0 sm:z-10',
          className
        )}
        {...props}
      >
        {condensedTitle ? (
          <div
            data-slot="detail-header-condensed"
            className="flex min-w-0 items-center gap-2.5 px-4 pt-3 pb-2 sm:px-6 lg:px-8"
          >
            {condensedTitle}
          </div>
        ) : null}
        {children}
      </div>
    </>
  )
})
DetailHeader.displayName = 'DetailHeader'

/**
 * Warning strip above the identity card (soft-deleted records, per the
 * deletion policy's "explicit deleted indicator before any details are
 * rendered"). Its own inset card so it stacks with the header rather than
 * cutting a full-bleed slab across the column, and it stays outside any
 * chrome gate so the indicator survives on sub-pages that hide the header.
 */
const DetailHeaderNotice = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div className="876-detail-header-shell px-4 pt-4 sm:px-6 lg:px-8">
    <div
      ref={ref}
      role="status"
      className={cn(
        'flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-400',
        className
      )}
      {...props}
    />
  </div>
))
DetailHeaderNotice.displayName = 'DetailHeaderNotice'

const DetailHeaderTop = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="detail-header-top"
    className={cn('px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 lg:px-8', className)}
  >
    <div
      className={cn(
        'flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3'
      )}
      {...props}
    />
  </div>
))
DetailHeaderTop.displayName = 'DetailHeaderTop'

const DetailHeaderMain = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex min-w-0 items-center gap-3 sm:gap-4', className)}
    {...props}
  />
))
DetailHeaderMain.displayName = 'DetailHeaderMain'

const DetailHeaderActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex w-full shrink-0 sm:w-auto sm:justify-end sm:pt-0.5',
      className
    )}
    {...props}
  />
))
DetailHeaderActions.displayName = 'DetailHeaderActions'

const DetailHeaderTabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('876-detail-header-tabs px-4 sm:px-6 lg:px-8', className)}
    {...props}
  />
))
DetailHeaderTabs.displayName = 'DetailHeaderTabs'

export {
  DetailHeader,
  DetailHeaderNotice,
  DetailHeaderTop,
  DetailHeaderMain,
  DetailHeaderActions,
  DetailHeaderTabs,
}
