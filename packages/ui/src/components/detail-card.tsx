'use client'

import * as React from 'react'

import { XIcon } from '../icons'
import { cn } from '../lib/utils'
import { Button } from './button'

/**
 * The card that fills a `ListDetailShell`'s detail column — a record, or the
 * form that creates one.
 *
 * It is deliberately chrome only: a header that names what is open and offers
 * a way out, a scrollable body, and an optional action footer. What goes
 * inside is the route's business.
 *
 * ```tsx
 * <DetailCard aria-label="New role">
 *   <DetailCardHeader
 *     icon={<ShieldPlus className="size-5" />}
 *     title="New role"
 *     subtitle="Create a custom role with a tailored permission set."
 *     onClose={close}
 *     closeLabel="Close role creation"
 *   />
 *   <DetailCardBody>{fields}</DetailCardBody>
 *   <DetailCardFooter>{actions}</DetailCardFooter>
 * </DetailCard>
 * ```
 */
function DetailCard({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      data-slot="detail-card"
      className={cn(
        '876-card flex h-full min-w-0 flex-col overflow-hidden',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-safe:ease-out',
        className
      )}
      {...props}
    />
  )
}

type DetailCardHeaderProps = {
  /** Leading visual — an avatar, a logo, or an icon in a tinted tile. */
  icon?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Rendered beside the title — badges, status, and the like. */
  meta?: React.ReactNode
  /** Closes the card. Omit for a card that cannot be dismissed. */
  onClose?: () => void
  /** Accessible name for the close button. Say what is being closed. */
  closeLabel?: string
  className?: string
  children?: React.ReactNode
}

function DetailCardHeader({
  icon,
  title,
  subtitle,
  meta,
  onClose,
  closeLabel = 'Close',
  className,
  children,
}: DetailCardHeaderProps) {
  return (
    <header
      data-slot="detail-card-header"
      className={cn(
        'border-876-surface-border flex shrink-0 items-start gap-4 border-b px-6 py-5',
        className
      )}
    >
      {icon ? <div className="shrink-0">{icon}</div> : null}

      <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-foreground truncate text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </h2>
          {meta}
        </div>
        {subtitle ? (
          <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
        ) : null}
        {children}
      </div>

      {onClose ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label={closeLabel}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <XIcon className="size-4" />
        </Button>
      ) : null}
    </header>
  )
}

/** Tinted square that holds a lucide icon in a card header. */
function DetailCardIcon({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="detail-card-icon"
      className={cn(
        'bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl',
        className
      )}
      {...props}
    />
  )
}

/** The scrolling region. Everything that is not header or footer goes here. */
function DetailCardBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="detail-card-body"
      className={cn(
        '876-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-6',
        className
      )}
      {...props}
    />
  )
}

/** Pinned action row. Actions are right-aligned, primary last. */
function DetailCardFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="detail-card-footer"
      className={cn(
        'border-876-surface-border flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4',
        className
      )}
      {...props}
    />
  )
}

export {
  DetailCard,
  DetailCardHeader,
  DetailCardIcon,
  DetailCardBody,
  DetailCardFooter,
}
