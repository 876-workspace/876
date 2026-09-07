'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { XIcon } from '../icons'
import { cn } from '../lib/utils'
import { Button, buttonVariants } from './button'
import { isRouteTabActive, type RouteTabItem } from './route-tabs'

/**
 * The card that fills a `ListDetailShell`'s detail column — a record, or the
 * form that creates one.
 *
 * It is deliberately chrome only: a header that names what is open and offers
 * a way out, an optional tab strip, a scrollable body, and a footer. What goes
 * inside is the route's business.
 *
 * ```tsx
 * <DetailCard aria-label={`Customer: ${customer.name}`}>
 *   <DetailCardHeader
 *     icon={<CustomerAvatar name={customer.name} />}
 *     title={customer.name}
 *     meta={<Badge variant="success">Active</Badge>}
 *     subtitle={
 *       <DetailCardMeta>
 *         <DetailCardMetaItem icon={<Mail />} href={`mailto:${customer.email}`}>
 *           {customer.email}
 *         </DetailCardMetaItem>
 *       </DetailCardMeta>
 *     }
 *     actions={<EditButton />}
 *     onClose={close}
 *     closeLabel="Close customer details"
 *   />
 *   <DetailCardTabs>
 *     <DetailCardTab href={base} active={segment === null}>Overview</DetailCardTab>
 *   </DetailCardTabs>
 *   <DetailCardBody>{children}</DetailCardBody>
 *   <DetailCardIdBar>{customer.id}</DetailCardIdBar>
 * </DetailCard>
 * ```
 */
function DetailCard({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      data-slot="detail-card"
      className={cn(
        // The card fills its pane and scrolls its own body, so the record's
        // name and tab strip stay pinned while the content moves under them —
        // and the card never ends mid-pane in a border a reader would take for
        // the end of the record. `h-full` resolves to `auto` while the panes
        // are stacked, where the card grows and the pane scrolls instead.
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
  /** Secondary line under the title. A `DetailCardMeta` row belongs here. */
  subtitle?: React.ReactNode
  /** Rendered beside the title — badges, status, and the like. */
  meta?: React.ReactNode
  /** Record actions — edit, a `···` menu. Rendered before the close button. */
  actions?: React.ReactNode
  /** Closes the card. Omit for a card that cannot be dismissed. */
  onClose?: () => void
  /**
   * Closes the card by navigating back to the list. Use this instead of
   * `onClose` from a server component — it needs no client boundary. Ignored
   * when `onClose` is given.
   */
  closeHref?: string
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
  actions,
  onClose,
  closeHref,
  closeLabel = 'Close',
  className,
  children,
}: DetailCardHeaderProps) {
  const closeIcon = <XIcon className="size-4" />
  const closeClassName = 'text-destructive hover:text-destructive'
  return (
    <header
      data-slot="detail-card-header"
      className={cn(
        'border-876-surface-border flex shrink-0 items-start gap-4 border-b px-5 py-4',
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
          <div className="text-muted-foreground truncate text-xs">
            {subtitle}
          </div>
        ) : null}
        {children}
      </div>

      {actions || onClose || closeHref ? (
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          {actions}
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label={closeLabel}
              className={closeClassName}
            >
              {closeIcon}
            </Button>
          ) : closeHref ? (
            <Link
              href={closeHref}
              aria-label={closeLabel}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                closeClassName
              )}
            >
              {closeIcon}
            </Link>
          ) : null}
        </div>
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

/** Wrapping row of small muted facts under a card title. */
function DetailCardMeta({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="detail-card-meta"
      className={cn(
        'text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs',
        className
      )}
      {...props}
    />
  )
}

type DetailCardMetaItemProps = {
  /** Small leading glyph. Sized and muted by this component. */
  icon?: React.ReactNode
  /** Renders the value as a link — `mailto:`, `tel:`, or a route. */
  href?: string
  className?: string
  children: React.ReactNode
}

/** One fact in a `DetailCardMeta` row, optionally an icon and a link. */
function DetailCardMetaItem({
  icon,
  href,
  className,
  children,
}: DetailCardMetaItemProps) {
  return (
    <span
      data-slot="detail-card-meta-item"
      className={cn(
        'inline-flex min-w-0 items-center gap-1',
        // The glyph is styled here so callers pass a bare icon element.
        '[&_svg]:text-muted-foreground/70 [&_svg]:size-3.5 [&_svg]:shrink-0',
        className
      )}
    >
      {icon}
      {href ? (
        <a
          href={href}
          className="hover:text-foreground truncate hover:underline"
        >
          {children}
        </a>
      ) : (
        <span className="truncate">{children}</span>
      )}
    </span>
  )
}

/**
 * Tab strip between a card's header and its body.
 *
 * It scrolls horizontally rather than wrapping, so a record with many tabs
 * keeps the card's height predictable.
 */
function DetailCardTabs({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="detail-card-tabs"
      className={cn(
        'border-876-surface-border shrink-0 border-b px-5 pt-3',
        className
      )}
    >
      <div
        className="876-scroll flex items-center gap-6 overflow-x-auto"
        {...props}
      />
    </div>
  )
}

type DetailCardTabProps = {
  href: string
  active?: boolean
  className?: string
  children: React.ReactNode
}

/** One tab in a `DetailCardTabs` strip. Navigation, not local state. */
function DetailCardTab({
  href,
  active = false,
  className,
  children,
}: DetailCardTabProps) {
  return (
    <Link
      data-slot="detail-card-tab"
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'border-b-2 pb-3 text-xs font-medium whitespace-nowrap transition-colors',
        active
          ? 'border-primary text-foreground font-semibold'
          : 'text-muted-foreground hover:text-foreground border-transparent',
        className
      )}
    >
      {children}
    </Link>
  )
}

/**
 * The scrolling region. Everything that is not header, tabs, or footer goes
 * here.
 *
 * Deliberately **not** `overscroll-contain`: this pane sits in the page, not
 * over it. Containing the overscroll stops the wheel from reaching the page
 * once the pane is at its bounds — and in Chrome it stops it even when the
 * pane has nothing to scroll at all, which reads as the whole screen freezing
 * while the cursor happens to be over the card.
 */
function DetailCardBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="detail-card-body"
      className={cn('876-scroll min-w-0 flex-1 overflow-y-auto p-5', className)}
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
        'border-876-surface-border flex shrink-0 items-center justify-end gap-3 border-t px-5 py-4',
        className
      )}
      {...props}
    />
  )
}

/** Quiet strip pinning the record's own identifier to the bottom of the card. */
function DetailCardIdBar({
  className,
  ...props
}: React.ComponentProps<'footer'>) {
  return (
    <footer
      data-slot="detail-card-id-bar"
      className={cn(
        'border-876-surface-border bg-muted/30 text-muted-foreground flex shrink-0 items-center justify-between gap-3 border-t px-5 py-2.5 font-mono text-xs',
        className
      )}
      {...props}
    />
  )
}

/**
 * A card tab strip driven by the current route.
 *
 * This is what a section layout renders: it takes the same `RouteTabItem[]`
 * the page-level `RouteTabs` takes, so a record's tabs are declared once, as
 * data, in a server component.
 */
function DetailCardRouteTabs({
  tabs,
  className,
}: {
  tabs: readonly RouteTabItem[]
  className?: string
}) {
  const pathname = usePathname()

  return (
    <DetailCardTabs className={className}>
      {tabs.map((tab) => (
        <DetailCardTab
          key={tab.href}
          href={tab.href}
          active={isRouteTabActive(tab, pathname)}
        >
          {tab.label}
        </DetailCardTab>
      ))}
    </DetailCardTabs>
  )
}

/**
 * A titled block inside a card body.
 *
 * The card is already the surface, so a section is a heading and its content —
 * never another bordered card. Nesting card chrome inside card chrome is what
 * makes a record read as a pile of boxes.
 */
function DetailCardSection({
  title,
  className,
  children,
  ...props
}: React.ComponentProps<'section'> & { title?: React.ReactNode }) {
  return (
    <section
      data-slot="detail-card-section"
      className={cn('min-w-0', className)}
      {...props}
    >
      {title ? <DetailCardSectionTitle>{title}</DetailCardSectionTitle> : null}
      {children}
    </section>
  )
}

/** Quiet label above a card-body section. */
function DetailCardSectionTitle({
  className,
  ...props
}: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="detail-card-section-title"
      className={cn(
        'text-muted-foreground border-876-surface-border mb-3 border-b pb-2 text-[0.6875rem] font-semibold tracking-wider uppercase',
        className
      )}
      {...props}
    />
  )
}

/** Definition list for a section's facts. Two columns from `sm` up. */
function DetailCardFacts({ className, ...props }: React.ComponentProps<'dl'>) {
  return (
    <dl
      data-slot="detail-card-facts"
      className={cn('grid gap-x-6 gap-y-4 sm:grid-cols-2', className)}
      {...props}
    />
  )
}

/** One label/value pair. `mono` for identifiers and amounts. */
function DetailCardFact({
  label,
  value,
  mono = false,
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  mono?: boolean
  className?: string
}) {
  return (
    <div data-slot="detail-card-fact" className={cn('min-w-0', className)}>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={cn(
          'text-foreground mt-1 truncate text-sm',
          mono && 'font-mono tabular-nums'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

/**
 * The one number a record is about — an item's price, an invoice's total.
 *
 * A record card that opens with a wall of equal-weight facts gives the eye
 * nowhere to land; this is the fact that answers "what is this worth".
 */
function DetailCardHeadline({
  value,
  caption,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  value: React.ReactNode
  caption?: React.ReactNode
}) {
  return (
    <div
      data-slot="detail-card-headline"
      className={cn('min-w-0', className)}
      {...props}
    >
      <p className="text-foreground truncate text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {caption ? (
        <p className="text-muted-foreground mt-1 text-xs">{caption}</p>
      ) : null}
    </div>
  )
}

export {
  DetailCard,
  DetailCardHeader,
  DetailCardIcon,
  DetailCardMeta,
  DetailCardMetaItem,
  DetailCardTabs,
  DetailCardTab,
  DetailCardRouteTabs,
  DetailCardBody,
  DetailCardSection,
  DetailCardSectionTitle,
  DetailCardFacts,
  DetailCardFact,
  DetailCardHeadline,
  DetailCardFooter,
  DetailCardIdBar,
}
