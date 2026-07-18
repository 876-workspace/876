import * as React from 'react'
import { cn } from '../lib/utils'

const DetailHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('876-detail-header sm:sticky sm:top-0 sm:z-10', className)}
    {...props}
  />
))
DetailHeader.displayName = 'DetailHeader'

const DetailHeaderTop = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-4 pt-3 pb-3 sm:px-6 sm:pt-5 sm:pb-5 lg:px-8', className)}
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
  <div ref={ref} className={cn('px-4 sm:px-6 lg:px-8', className)} {...props} />
))
DetailHeaderTabs.displayName = 'DetailHeaderTabs'

export {
  DetailHeader,
  DetailHeaderTop,
  DetailHeaderMain,
  DetailHeaderActions,
  DetailHeaderTabs,
}
