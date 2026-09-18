'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import Link from 'next/link'

import { Button } from '../components/button'
import { X } from '../icons'
import { cn } from '../lib/utils'
import type { Announcement, AnnouncementActionKey } from './types'

/** Actions read as links, not buttons: the bar is a notice, not a form. */
const actionClassName =
  'shrink-0 font-medium underline underline-offset-2 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-hidden rounded-sm'

const barVariants = cva(
  'flex w-full shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm sm:px-6 lg:px-8',
  {
    variants: {
      tone: {
        info: 'bg-info/10 text-info border-info/20',
        success: 'bg-success/10 text-success border-success/20',
        warning: 'bg-warning/10 text-warning border-warning/20',
        critical: 'bg-destructive/10 text-destructive border-destructive/20',
        promo: 'bg-brand-accent/10 text-brand-accent border-brand-accent/20',
      },
    },
    defaultVariants: { tone: 'info' },
  }
)

export interface AnnouncementBarProps extends VariantProps<typeof barVariants> {
  announcement: Announcement
  /** Invoked for an action whose `action` key the region owns. */
  onAction?: (key: AnnouncementActionKey) => void
  onDismiss?: () => void
  className?: string
}

/**
 * One announcement, rendered as a full-width bar.
 *
 * It is deliberately a strip and not a dialog, a toast, or a page: it must be
 * readable without stealing focus, must not cover the work underneath, and
 * must survive a route change (the region lives in the shell, above the page).
 */
export function AnnouncementBar({
  announcement,
  onAction,
  onDismiss,
  className,
}: AnnouncementBarProps) {
  const { tone, title, message, actions = [], dismissible } = announcement

  return (
    <div
      role="status"
      aria-live="polite"
      data-announcement={announcement.id}
      className={cn(barVariants({ tone }), className)}
    >
      <p className="min-w-0 flex-1">
        {title ? <span className="font-medium">{title} </span> : null}
        <span className="opacity-90">{message}</span>
      </p>

      {actions.length > 0 ? (
        <div className="flex items-center gap-3">
          {actions.map((action) =>
            action.href !== undefined ? (
              action.external ? (
                <a
                  key={action.label}
                  href={action.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={actionClassName}
                >
                  {action.label}
                </a>
              ) : (
                <Link
                  key={action.label}
                  href={action.href}
                  className={actionClassName}
                >
                  {action.label}
                </Link>
              )
            ) : (
              <button
                key={action.label}
                type="button"
                className={actionClassName}
                onClick={() => onAction?.(action.action)}
              >
                {action.label}
              </button>
            )
          )}
        </div>
      ) : null}

      {dismissible ? (
        <Button
          size="icon-sm"
          variant="ghost"
          className="size-7 shrink-0"
          aria-label="Dismiss announcement"
          onClick={onDismiss}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}
