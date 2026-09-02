'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from '@876/ui/icons'

import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'
import type { AppWorkspace, WorkspaceIconKey } from '../app-workspaces'
import { WorkspaceIcon } from './workspace-icon'
import { WorkspaceNav } from './workspace-nav'

type Props = {
  workspace: AppWorkspace
  orgSlug: string
  /**
   * The sections this organization actually has, resolved on the server from
   * the product's own navigation registry against the organization's feature
   * rollout. An organization without `billing-banking` has no Banking section
   * here, exactly as its own members see.
   */
  links: {
    label: string
    href: string
    iconKey: WorkspaceIconKey
    exact: boolean
  }[]
  /**
   * The organization's display name for the "whose workspace is this" line.
   *
   * A node rather than a string so the caller can stream it: resolving the name
   * is I/O, and the frame must not wait on I/O to render.
   */
  orgName: ReactNode
  /** Streams in the real app logo from Core catalog. */
  appLogo?: ReactNode
  /** Streams in above the content — an entitlement notice, usually. */
  notice?: ReactNode
  children: ReactNode
}

const STORAGE_KEY = '876_workspace_sidebar_collapsed'

const collapseListeners = new Set<() => void>()

function subscribeToCollapsed(onChange: () => void) {
  collapseListeners.add(onChange)
  window.addEventListener('storage', onChange)
  return () => {
    collapseListeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {
    // Private browsing, blocked site data — fall back to the default.
    return true
  }
}

function writeCollapsed(next: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(next))
  } catch {
    // Ignore local storage errors; the rail still toggles for this render.
  }
  for (const listener of collapseListeners) listener()
}

/**
 * The frame an operator works inside when they open an organization's app.
 *
 * Full-height secondary sidebar pane that connects directly with the main Console
 * sidebar on the left when expanded, and transitions to a sleek floating rail with
 * rounded borders when collapsed.
 */
export function WorkspaceShell({
  workspace,
  orgSlug,
  links,
  appLogo,
  notice,
  children,
}: Props) {
  // The stored preference is read through an external store rather than an
  // effect, so the rail renders in its remembered state on the first client
  // paint instead of flashing collapsed and then widening.
  const isCollapsed = useSyncExternalStore(
    subscribeToCollapsed,
    readCollapsed,
    () => true
  )

  const handleToggle = writeCollapsed

  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100vh-theme(spacing.28))] flex-col sm:-mx-6 lg:-mx-8 lg:flex-row lg:items-stretch">
      {/* Mobile Top Navigation (Horizontal) */}
      <div className="border-border bg-muted/15 flex w-full flex-col border-b lg:hidden">
        <div className="border-border/60 flex items-center gap-2 border-b px-4 py-3">
          {appLogo ?? (
            <span className="bg-muted text-muted-foreground border-border/50 flex size-5.5 shrink-0 items-center justify-center rounded-md border">
              <WorkspaceIcon
                iconKey={workspace.iconKey}
                colored
                className="size-3.5"
              />
            </span>
          )}
          <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            {workspace.label}
          </span>
        </div>
        <div className="p-2.5">
          <WorkspaceNav links={links} />
        </div>
      </div>

      {/* Desktop Workspace Sidebar */}
      {isCollapsed ? (
        <aside className="hidden w-16 shrink-0 flex-col items-center py-4 pr-1 pl-3 transition-[width,padding] duration-200 ease-in-out lg:flex">
          <div className="border-border/80 bg-background/90 dark:bg-sidebar/90 sticky top-20 flex w-full flex-col items-center gap-2 rounded-2xl border p-2.5 shadow-xl ring-1 shadow-black/5 ring-black/[0.04] backdrop-blur-xl transition-all duration-200 dark:shadow-black/25 dark:ring-white/[0.06]">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => handleToggle(false)}
                    aria-label={`Expand ${workspace.label} sidebar`}
                    className="group/btn hover:bg-muted/80 relative flex size-8.5 items-center justify-center rounded-xl transition-all duration-150"
                  >
                    {appLogo ?? (
                      <span className="bg-muted text-muted-foreground border-border/50 flex size-6 shrink-0 items-center justify-center rounded-lg border shadow-2xs">
                        <WorkspaceIcon
                          iconKey={workspace.iconKey}
                          colored
                          className="size-3.5"
                        />
                      </span>
                    )}
                    <span className="bg-background/95 dark:bg-sidebar/95 border-border/60 absolute inset-0 flex items-center justify-center rounded-xl border opacity-0 shadow-2xs transition-opacity duration-150 group-hover/btn:opacity-100">
                      <ChevronRight className="text-foreground size-3.5" />
                    </span>
                  </button>
                }
              />
              <TooltipContent side="right" sideOffset={8}>
                Expand {workspace.label}
              </TooltipContent>
            </Tooltip>

            <div className="bg-border/60 my-0.5 h-px w-5" />

            <WorkspaceNav links={links} collapsed={true} />
          </div>
        </aside>
      ) : (
        <aside className="hidden w-56 shrink-0 flex-col py-4 pr-2 pl-3 transition-[width,padding] duration-200 ease-in-out lg:flex lg:w-60">
          <div className="border-border/80 bg-background/90 dark:bg-sidebar/90 sticky top-20 flex w-full flex-col gap-2 rounded-2xl border p-3 shadow-xl ring-1 shadow-black/5 ring-black/[0.04] backdrop-blur-xl transition-all duration-200 dark:shadow-black/25 dark:ring-white/[0.06]">
            <div className="flex items-center justify-between px-1 py-1">
              <div className="flex min-w-0 items-center gap-2">
                {appLogo ?? (
                  <span className="bg-muted text-muted-foreground border-border/50 flex size-6 shrink-0 items-center justify-center rounded-lg border shadow-2xs">
                    <WorkspaceIcon
                      iconKey={workspace.iconKey}
                      colored
                      className="size-3.5"
                    />
                  </span>
                )}
                <span className="text-muted-foreground truncate text-xs font-semibold tracking-wider uppercase">
                  {workspace.label}
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => handleToggle(true)}
                      aria-label="Collapse to floating rail"
                      className="text-muted-foreground hover:text-foreground hover:bg-muted/80 flex size-6.5 shrink-0 items-center justify-center rounded-lg transition-colors"
                    >
                      <ChevronLeft className="size-3.5" />
                    </button>
                  }
                />
                <TooltipContent side="bottom" sideOffset={4}>
                  Collapse to floating rail
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="bg-border/60 my-0.5 h-px w-full" />

            <div className="flex-1">
              <WorkspaceNav links={links} collapsed={false} />
            </div>
          </div>
        </aside>
      )}

      {/* Main Workspace Content Area */}
      <main className="min-w-0 flex-1 space-y-6 p-4 transition-all duration-200 sm:p-6 lg:p-8">
        {notice}
        {children}
      </main>
    </div>
  )
}
