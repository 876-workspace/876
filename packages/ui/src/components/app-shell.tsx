import * as React from 'react'
import { cn } from '../lib/utils'
import { SidebarProvider, SidebarInset } from './sidebar'

const AppShell = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof SidebarProvider>
>(({ className, ...props }, ref) => (
  <SidebarProvider
    ref={ref}
    className={cn('h-svh overflow-hidden', className)}
    {...props}
  />
))
AppShell.displayName = 'AppShell'

const AppShellSidebarArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('contents', className)} {...props} />
))
AppShellSidebarArea.displayName = 'AppShellSidebarArea'

const AppShellContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof SidebarInset>
>(({ className, ...props }, ref) => (
  <SidebarInset
    ref={ref}
    className={cn(
      // min-w-0 so a sibling widget dock can sit to the right without overflow.
      'bg-876-canvas flex h-svh min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
      className
    )}
    {...props}
  />
))
AppShellContent.displayName = 'AppShellContent'

const AppShellHeader = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <header
    ref={ref}
    className={cn(
      '876-topbar border-876-surface-border z-20 flex h-14 shrink-0 items-center gap-3 border-b pr-4 pl-3 sm:pr-6 lg:pr-8',
      className
    )}
    {...props}
  />
))
AppShellHeader.displayName = 'AppShellHeader'

/** Row under the topbar: main page column + optional right-hand widget dock. */
const AppShellBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden',
      className
    )}
    {...props}
  />
))
AppShellBody.displayName = 'AppShellBody'

const AppShellMain = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('min-h-0 min-w-0 flex-1 overflow-y-auto', className)}
    {...props}
  />
))
AppShellMain.displayName = 'AppShellMain'

export {
  AppShell,
  AppShellSidebarArea,
  AppShellContent,
  AppShellHeader,
  AppShellBody,
  AppShellMain,
}
