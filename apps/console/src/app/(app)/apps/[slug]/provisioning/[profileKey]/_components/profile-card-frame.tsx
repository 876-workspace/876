'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ApplicationProvisioningProfile } from '@876/core/types/application-provisioning-profile'
import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { Button, buttonVariants } from '@876/ui/button'
import {
  AdjustmentsHorizontalIcon,
  ChevronLeft,
  ChevronRight,
  DocumentTextIcon,
  Settings,
  XIcon,
} from '@876/ui/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'

export type ProfileCardTab = 'settings' | 'routing' | 'documents'

export function ProfileCardFrame({
  profile,
  slug,
  appId,
  children,
  settingsContent,
  routingContent,
  documentsContent,
  documentsCount,
  resourceTabLabel = 'Documents',
  initialTab = 'settings',
  defaultCollapsed = true,
}: {
  profile: ApplicationProvisioningProfile
  slug: string
  appId: string
  children?: ReactNode
  settingsContent?: ReactNode
  routingContent?: ReactNode
  documentsContent?: ReactNode
  documentsCount?: number
  resourceTabLabel?: string
  initialTab?: ProfileCardTab
  defaultCollapsed?: boolean
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ProfileCardTab>(initialTab)
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  return (
    <section
      aria-label={`Provisioning profile: ${profile.name}`}
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 flex h-full min-h-0 min-w-0 flex-row items-start gap-4 overflow-hidden motion-safe:duration-300 motion-safe:ease-out"
    >
      {/* Floating Sidebar (Separate on Left) */}
      <aside
        aria-label="Profile navigation"
        className={cn(
          'flex shrink-0 flex-col transition-[width,padding] duration-200 ease-in-out',
          isCollapsed ? 'w-14' : 'w-48 lg:w-52'
        )}
      >
        <nav
          aria-label="Profile sections"
          className={cn(
            'border-border/80 bg-background/90 dark:bg-sidebar/90 sticky top-4 flex w-full flex-col rounded-2xl border p-2 shadow-xl ring-1 shadow-black/5 ring-black/[0.04] backdrop-blur-xl transition-all duration-200 dark:shadow-black/25 dark:ring-white/[0.06]',
            isCollapsed ? 'items-center gap-1.5' : 'gap-1.5'
          )}
        >
          {isCollapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => setIsCollapsed(false)}
                      aria-label="Expand sidebar"
                      className="text-muted-foreground hover:text-foreground hover:bg-muted/80 flex size-8 cursor-pointer items-center justify-center rounded-xl transition-colors"
                    >
                      <ChevronRight className="size-3.5" />
                    </button>
                  }
                />
                <TooltipContent side="right" sideOffset={8}>
                  Expand sidebar
                </TooltipContent>
              </Tooltip>

              <div className="bg-border/60 my-0.5 h-px w-5" />

              {/* Settings Tab (Icon-only) */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      aria-label="Settings"
                      aria-current={
                        activeTab === 'settings' ? 'page' : undefined
                      }
                      className={cn(
                        'group relative flex size-8.5 cursor-pointer items-center justify-center rounded-xl transition-all duration-150',
                        activeTab === 'settings'
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-border/40 font-medium shadow-xs ring-1'
                          : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                      )}
                    >
                      <Settings className="size-4 shrink-0 text-sky-500 transition-transform duration-150 group-hover:scale-110 dark:text-sky-400" />
                    </button>
                  }
                />
                <TooltipContent side="right" sideOffset={8}>
                  Settings
                </TooltipContent>
              </Tooltip>

              {/* Routing Tab (Icon-only) */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => setActiveTab('routing')}
                      aria-label="Routing"
                      aria-current={
                        activeTab === 'routing' ? 'page' : undefined
                      }
                      className={cn(
                        'group relative flex size-8.5 cursor-pointer items-center justify-center rounded-xl transition-all duration-150',
                        activeTab === 'routing'
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-border/40 font-medium shadow-xs ring-1'
                          : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                      )}
                    >
                      <AdjustmentsHorizontalIcon className="size-4 shrink-0 text-indigo-500 transition-transform duration-150 group-hover:scale-110 dark:text-indigo-400" />
                      {profile.conditions.length > 0 ? (
                        <span className="absolute top-1 right-1 size-1.5 rounded-full bg-indigo-500" />
                      ) : null}
                    </button>
                  }
                />
                <TooltipContent side="right" sideOffset={8}>
                  Routing
                  {profile.conditions.length > 0
                    ? ` (${profile.conditions.length})`
                    : ''}
                </TooltipContent>
              </Tooltip>

              {/* Documents Tab (Icon-only) */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => setActiveTab('documents')}
                      aria-label={resourceTabLabel}
                      aria-current={
                        activeTab === 'documents' ? 'page' : undefined
                      }
                      className={cn(
                        'group relative flex size-8.5 cursor-pointer items-center justify-center rounded-xl transition-all duration-150',
                        activeTab === 'documents'
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-border/40 font-medium shadow-xs ring-1'
                          : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                      )}
                    >
                      <DocumentTextIcon className="size-4 shrink-0 text-blue-500 transition-transform duration-150 group-hover:scale-110 dark:text-blue-400" />
                      {documentsCount !== undefined && documentsCount > 0 ? (
                        <span className="absolute top-1 right-1 size-1.5 rounded-full bg-blue-500" />
                      ) : null}
                    </button>
                  }
                />
                <TooltipContent side="right" sideOffset={8}>
                  {resourceTabLabel}
                  {documentsCount !== undefined ? ` (${documentsCount})` : ''}
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Profile
                </span>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => setIsCollapsed(true)}
                        aria-label="Collapse sidebar"
                        className="text-muted-foreground hover:text-foreground hover:bg-muted/80 flex size-6.5 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors"
                      >
                        <ChevronLeft className="size-3.5" />
                      </button>
                    }
                  />
                  <TooltipContent side="bottom" sideOffset={4}>
                    Collapse to rail
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="bg-border/60 my-0.5 h-px w-full" />

              {/* Settings Tab (Expanded) */}
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                aria-current={activeTab === 'settings' ? 'page' : undefined}
                className={cn(
                  'group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[0.8125rem] font-medium whitespace-nowrap transition-all duration-150',
                  activeTab === 'settings'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-border/40 font-medium shadow-xs ring-1'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                )}
              >
                <Settings className="size-4 shrink-0 text-sky-500 transition-transform duration-150 group-hover:scale-105 dark:text-sky-400" />
                <span className="flex-1 truncate">Settings</span>
              </button>

              {/* Routing Tab (Expanded) */}
              <button
                type="button"
                onClick={() => setActiveTab('routing')}
                aria-current={activeTab === 'routing' ? 'page' : undefined}
                className={cn(
                  'group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[0.8125rem] font-medium whitespace-nowrap transition-all duration-150',
                  activeTab === 'routing'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-border/40 font-medium shadow-xs ring-1'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                )}
              >
                <AdjustmentsHorizontalIcon className="size-4 shrink-0 text-indigo-500 transition-transform duration-150 group-hover:scale-105 dark:text-indigo-400" />
                <span className="flex-1 truncate">Routing</span>
                {profile.conditions.length > 0 ? (
                  <span
                    className={cn(
                      'ml-auto inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 font-mono text-[10px] transition-colors',
                      activeTab === 'routing'
                        ? 'bg-background/80 text-foreground font-medium shadow-2xs'
                        : 'bg-muted text-muted-foreground group-hover:text-foreground'
                    )}
                  >
                    {profile.conditions.length}
                  </span>
                ) : null}
              </button>

              {/* Documents Tab (Expanded) */}
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                aria-current={activeTab === 'documents' ? 'page' : undefined}
                className={cn(
                  'group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[0.8125rem] font-medium whitespace-nowrap transition-all duration-150',
                  activeTab === 'documents'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-border/40 font-medium shadow-xs ring-1'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                )}
              >
                <DocumentTextIcon className="size-4 shrink-0 text-blue-500 transition-transform duration-150 group-hover:scale-105 dark:text-blue-400" />
                <span className="flex-1 truncate">{resourceTabLabel}</span>
                {documentsCount !== undefined ? (
                  <span
                    className={cn(
                      'ml-auto inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 font-mono text-[10px] transition-colors',
                      activeTab === 'documents'
                        ? 'bg-background/80 text-foreground font-medium shadow-2xs'
                        : 'bg-muted text-muted-foreground group-hover:text-foreground'
                    )}
                  >
                    {documentsCount}
                  </span>
                ) : null}
              </button>
            </>
          )}
        </nav>
      </aside>

      {/* Main Content Card */}
      <div className="876-card flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-876-surface-border flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-foreground truncate text-lg font-semibold tracking-tight sm:text-xl">
                {profile.name}
              </h2>
              {profile.is_default ? (
                <Badge variant="info">Default</Badge>
              ) : null}
              <Badge
                variant={
                  profile.status === 'active'
                    ? 'success'
                    : profile.status === 'draft'
                      ? 'outline'
                      : 'secondary'
                }
              >
                {profile.status}
              </Badge>
              {profile.published_revision !== null ? (
                <span className="text-muted-foreground font-mono text-xs">
                  r{profile.published_revision}
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground truncate font-mono text-xs">
              {profile.key}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/settings/orgs/provisioning/runs?app_id=${encodeURIComponent(appId)}`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Runs
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                router.push(`/apps/${encodeURIComponent(slug)}/provisioning`)
              }
              aria-label="Close provisioning profile"
              className="text-muted-foreground hover:text-foreground size-8 shrink-0"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </header>

        {/* Content Viewport */}
        <div className="876-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {settingsContent || routingContent || documentsContent ? (
            activeTab === 'settings' ? (
              <div className="p-6">{settingsContent}</div>
            ) : activeTab === 'routing' ? (
              <div className="p-6">{routingContent}</div>
            ) : (
              documentsContent
            )
          ) : (
            children
          )}
        </div>

        {/* Footer */}
        <footer className="border-876-surface-border bg-muted/30 text-muted-foreground shrink-0 border-t px-6 py-2.5 font-mono text-xs">
          {profile.id}
        </footer>
      </div>
    </section>
  )
}
