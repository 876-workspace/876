import * as React from 'react'
import { cn } from '../lib/utils'

export const DocumentView = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <article
    ref={ref}
    className={cn(
      '876-card bg-card text-card-foreground mx-auto max-w-5xl overflow-hidden shadow-sm print:border-0 print:bg-white print:text-black print:shadow-none',
      className
    )}
    {...props}
  />
))
DocumentView.displayName = 'DocumentView'

export const DocumentHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'border-border border-b px-6 py-8 sm:px-10 sm:py-10',
      className
    )}
    {...props}
  />
))
DocumentHeader.displayName = 'DocumentHeader'

export const DocumentHeaderTop = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col justify-between gap-8 sm:flex-row sm:items-start',
      className
    )}
    {...props}
  />
))
DocumentHeaderTop.displayName = 'DocumentHeaderTop'

export const DocumentTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('sm:text-right', className)} {...props} />
))
DocumentTitle.displayName = 'DocumentTitle'

export const DocumentDetailsGrid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('grid gap-8 px-6 py-8 sm:grid-cols-2 sm:px-10', className)}
    {...props}
  />
))
DocumentDetailsGrid.displayName = 'DocumentDetailsGrid'

export const DocumentRecipient = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <section ref={ref} className={className} {...props} />
))
DocumentRecipient.displayName = 'DocumentRecipient'

export const DocumentMetaList = React.forwardRef<
  HTMLDListElement,
  React.HTMLAttributes<HTMLDListElement>
>(({ className, ...props }, ref) => (
  <dl
    ref={ref}
    className={cn(
      'grid grid-cols-[1fr_auto] content-start gap-x-8 gap-y-3 text-sm sm:min-w-72 sm:justify-self-end',
      className
    )}
    {...props}
  />
))
DocumentMetaList.displayName = 'DocumentMetaList'

export function DocumentMeta({
  label,
  value,
}: {
  label: React.ReactNode
  value: React.ReactNode
}) {
  return (
    <>
      <dt className="text-muted-foreground print:text-neutral-600">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </>
  )
}

export const DocumentLines = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('overflow-x-auto px-6 sm:px-10', className)}
    {...props}
  />
))
DocumentLines.displayName = 'DocumentLines'

export const DocumentSummaryGrid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'grid gap-8 px-6 py-8 sm:grid-cols-[1fr_22rem] sm:px-10',
      className
    )}
    {...props}
  />
))
DocumentSummaryGrid.displayName = 'DocumentSummaryGrid'

export const DocumentNotes = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-6 text-sm', className)} {...props} />
))
DocumentNotes.displayName = 'DocumentNotes'

export const DocumentSummaryList = React.forwardRef<
  HTMLDListElement,
  React.HTMLAttributes<HTMLDListElement>
>(({ className, ...props }, ref) => (
  <dl ref={ref} className={cn('space-y-3 text-sm', className)} {...props} />
))
DocumentSummaryList.displayName = 'DocumentSummaryList'

export const DocumentSummaryRow = React.forwardRef<
  HTMLDivElement,
  {
    label: React.ReactNode
    value: React.ReactNode
    strong?: boolean
  } & React.HTMLAttributes<HTMLDivElement>
>(({ label, value, strong = false, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center justify-between',
      strong && 'font-semibold',
      className
    )}
    {...props}
  >
    <dt
      className={
        strong ? undefined : 'text-muted-foreground print:text-neutral-700'
      }
    >
      {label}
    </dt>
    <dd className="tabular-nums">{value}</dd>
  </div>
))
DocumentSummaryRow.displayName = 'DocumentSummaryRow'

export const DocumentTotalRow = React.forwardRef<
  HTMLDivElement,
  {
    label: React.ReactNode
    value: React.ReactNode
  } & React.HTMLAttributes<HTMLDivElement>
>(({ label, value, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'border-foreground mt-4 flex items-center justify-between border-t-2 pt-4 text-lg font-semibold print:border-black',
      className
    )}
    {...props}
  >
    <dt>{label}</dt>
    <dd className="tabular-nums">{value}</dd>
  </div>
))
DocumentTotalRow.displayName = 'DocumentTotalRow'

export const DocumentFooter = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <footer
    ref={ref}
    className={cn(
      'border-border text-muted-foreground border-t px-6 py-5 text-center text-xs sm:px-10 print:border-neutral-200 print:text-neutral-600',
      className
    )}
    {...props}
  />
))
DocumentFooter.displayName = 'DocumentFooter'
