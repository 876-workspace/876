import * as React from 'react'
import Link from 'next/link'

import { ArrowLeft } from '../icons'
import { cn } from '../lib/utils'

/**
 * Standard page container — the outermost wrapper of every routed page in
 * an 876-shell app. `hub` renders the wider variant reserved for
 * pure-navigation landing pages (no toolbar, table, or form; see the
 * app-layout rules).
 */
function Page({
  hub = false,
  className,
  ...props
}: React.ComponentProps<'div'> & { hub?: boolean }) {
  return (
    <div
      data-slot="page"
      className={cn(
        hub
          ? 'px-6 pt-5 pb-8 sm:px-8 lg:px-12'
          : 'px-4 pt-5 pb-8 sm:px-6 lg:px-8',
        className
      )}
      {...props}
    />
  )
}

/** Page header block — wraps the title (and optional description). */
function PageHeader({ className, ...props }: React.ComponentProps<'header'>) {
  return (
    <header
      data-slot="page-header"
      className={cn('mb-6', className)}
      {...props}
    />
  )
}

/** Page <h1>. */
function PageTitle({ className, ...props }: React.ComponentProps<'h1'>) {
  return (
    <h1
      data-slot="page-title"
      className={cn('876-page-title', className)}
      {...props}
    />
  )
}

/** Muted description paragraph under a page title. */
function PageDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="page-description"
      className={cn('text-muted-foreground mt-1 text-sm', className)}
      {...props}
    />
  )
}

type PageBreadcrumbProps = {
  href: string
  label: string
  className?: string
}

/** Back-link shown at the top of any page one level below a section landing page. */
function PageBreadcrumb({ href, label, className }: PageBreadcrumbProps) {
  return (
    <Link
      href={href}
      className={cn(
        'text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium transition-colors',
        className
      )}
    >
      <ArrowLeft aria-hidden="true" className="size-3.5" />
      {label}
    </Link>
  )
}

export { Page, PageHeader, PageTitle, PageDescription, PageBreadcrumb }
