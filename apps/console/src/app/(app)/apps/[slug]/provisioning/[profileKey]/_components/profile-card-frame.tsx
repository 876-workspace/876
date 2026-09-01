'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ApplicationProvisioningProfile } from '@876/core/types/application-provisioning-profile'
import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { Button, buttonVariants } from '@876/ui/button'
import type { IconComponent } from '@876/ui/icons'
import {
  AdjustmentsHorizontalIcon,
  ChevronLeft,
  ChevronRight,
  Settings,
  XIcon,
} from '@876/ui/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@876/ui/tooltip'
import {
  getResourceTypeColor,
  getResourceTypeIcon,
} from '@/features/provisioning/finance-provisioning-utils'

export interface ProfileResourceSection {
  key: string
  label: string
  count: number
  icon?: IconComponent
  color?: string
  content: ReactNode
}

export function ProfileCardFrame({
  profile,
  slug,
  appId,
  overviewContent,
  routingContent,
  resourceSections,
  defaultCollapsed = false,
}: {
  profile: ApplicationProvisioningProfile
  slug: string
  appId: string
  overviewContent: ReactNode
  routingContent: ReactNode
  resourceSections: ProfileResourceSection[]
  defaultCollapsed?: boolean
}) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('overview')
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  const sections = [
    {
      key: 'overview',
      label: 'Overview',
      count: null,
      icon: Settings,
      color: 'text-sky-500 dark:text-sky-400',
    },
    {
      key: 'routing',
      label: 'Routing',
      count: profile.conditions.length,
      icon: AdjustmentsHorizontalIcon,
      color: 'text-indigo-500 dark:text-indigo-400',
    },
    ...resourceSections.map((section) => ({
      key: section.key,
      label: section.label,
      count: section.count,
      icon: section.icon ?? getResourceTypeIcon(section.key),
      color: section.color ?? getResourceTypeColor(section.key),
    })),
  ]

  const activeContent =
    activeSection === 'overview'
      ? overviewContent
      : activeSection === 'routing'
        ? routingContent
        : resourceSections.find((section) => section.key === activeSection)
            ?.content

  return (
    <section
      aria-label={`Provisioning profile: ${profile.name}`}
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 flex h-full min-h-0 min-w-0 items-start gap-4 overflow-hidden motion-safe:duration-300"
    >
      <aside
        aria-label="Profile navigation"
        className={cn(
          'flex shrink-0 flex-col transition-[width] duration-200',
          isCollapsed ? 'w-14' : 'w-44'
        )}
      >
        <nav
          aria-label="Profile sections"
          className={cn(
            'border-border/80 bg-background/90 dark:bg-sidebar/90 sticky top-4 flex w-full flex-col gap-1.5 rounded-2xl border p-2 shadow-xl ring-1 shadow-black/5 ring-black/[0.04] backdrop-blur-xl',
            isCollapsed && 'items-center'
          )}
        >
          <div
            className={cn(
              'flex w-full items-center py-1',
              isCollapsed ? 'justify-center' : 'justify-between px-2'
            )}
          >
            {!isCollapsed ? (
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Profile
              </span>
            ) : null}
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => setIsCollapsed((current) => !current)}
                    aria-label={
                      isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
                    }
                    className="text-muted-foreground hover:text-foreground hover:bg-muted/80 flex size-7 items-center justify-center rounded-lg"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="size-3.5" />
                    ) : (
                      <ChevronLeft className="size-3.5" />
                    )}
                  </button>
                }
              />
              <TooltipContent side={isCollapsed ? 'right' : 'bottom'}>
                {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="bg-border/60 h-px w-full" />

          {sections.map((section) => {
            const active = activeSection === section.key
            const Icon = section.icon
            const button = (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                aria-label={section.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex cursor-pointer items-center rounded-xl text-[0.8125rem] font-medium transition-colors',
                  isCollapsed
                    ? 'size-8.5 justify-center'
                    : 'w-full gap-2.5 px-3 py-2 text-left',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-border/40 shadow-xs ring-1'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                )}
              >
                <Icon className={cn('size-4 shrink-0', section.color)} />
                {!isCollapsed ? (
                  <>
                    <span className="min-w-0 flex-1 truncate">
                      {section.label}
                    </span>
                    {section.count !== null ? (
                      <span className="bg-muted text-muted-foreground inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 font-mono text-[10px]">
                        {section.count}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </button>
            )

            if (!isCollapsed) return button
            return (
              <Tooltip key={section.key}>
                <TooltipTrigger render={button} />
                <TooltipContent side="right">
                  {section.label}
                  {section.count !== null ? ` (${section.count})` : ''}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>
      </aside>

      <div className="876-card flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-876-surface-border flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-foreground truncate text-lg font-semibold tracking-tight sm:text-xl">
                {profile.name}
              </h2>
              {profile.is_default ? <Badge variant="info">Default</Badge> : null}
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
              className="text-muted-foreground hover:text-foreground size-8"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </header>

        <div className="876-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {activeSection === 'overview' || activeSection === 'routing' ? (
            <div className="p-6">{activeContent}</div>
          ) : (
            activeContent
          )}
        </div>

        <footer className="border-876-surface-border bg-muted/30 text-muted-foreground shrink-0 border-t px-6 py-2.5 font-mono text-xs">
          {profile.id}
        </footer>
      </div>
    </section>
  )
}
