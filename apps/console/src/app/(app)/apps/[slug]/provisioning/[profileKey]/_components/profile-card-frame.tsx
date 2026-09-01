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
  DocumentTextIcon,
  Settings,
  XIcon,
} from '@876/ui/icons'

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
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ProfileCardTab>(initialTab)

  return (
    <section
      aria-label={`Provisioning profile: ${profile.name}`}
      className={cn(
        '876-card flex h-full min-w-0 flex-col overflow-hidden',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-safe:ease-out'
      )}
    >
      {/* Header */}
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
            className="text-muted-foreground hover:text-foreground size-8 shrink-0"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </header>

      {/* 3 Top-Level Tabs: Settings, Routing, Documents */}
      <div className="border-876-surface-border shrink-0 border-b px-6 pt-1">
        <nav
          aria-label="Profile tabs"
          className="no-scrollbar -mb-px flex items-end gap-2 overflow-x-auto"
        >
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            aria-current={activeTab === 'settings' ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-2 border-b-2 px-3.5 py-3 text-[0.8125rem] font-medium whitespace-nowrap transition-all cursor-pointer',
              activeTab === 'settings'
                ? 'border-foreground text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            )}
          >
            <Settings
              className={cn(
                'size-4 shrink-0 transition-colors',
                activeTab === 'settings'
                  ? 'text-sky-500 dark:text-sky-400'
                  : 'text-muted-foreground group-hover:text-foreground'
              )}
            />
            <span>Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('routing')}
            aria-current={activeTab === 'routing' ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-2 border-b-2 px-3.5 py-3 text-[0.8125rem] font-medium whitespace-nowrap transition-all cursor-pointer',
              activeTab === 'routing'
                ? 'border-foreground text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            )}
          >
            <AdjustmentsHorizontalIcon
              className={cn(
                'size-4 shrink-0 transition-colors',
                activeTab === 'routing'
                  ? 'text-indigo-500 dark:text-indigo-400'
                  : 'text-muted-foreground group-hover:text-foreground'
              )}
            />
            <span>Routing</span>
            {profile.conditions.length > 0 ? (
              <span
                className={cn(
                  'inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 font-mono text-[10px] transition-colors',
                  activeTab === 'routing'
                    ? 'bg-muted text-foreground font-medium'
                    : 'bg-muted/60 text-muted-foreground group-hover:text-foreground'
                )}
              >
                {profile.conditions.length}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            aria-current={activeTab === 'documents' ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-2 border-b-2 px-3.5 py-3 text-[0.8125rem] font-medium whitespace-nowrap transition-all cursor-pointer',
              activeTab === 'documents'
                ? 'border-foreground text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            )}
          >
            <DocumentTextIcon
              className={cn(
                'size-4 shrink-0 transition-colors',
                activeTab === 'documents'
                  ? 'text-blue-500 dark:text-blue-400'
                  : 'text-muted-foreground group-hover:text-foreground'
              )}
            />
            <span>{resourceTabLabel}</span>
            {documentsCount !== undefined ? (
              <span
                className={cn(
                  'inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 font-mono text-[10px] transition-colors',
                  activeTab === 'documents'
                    ? 'bg-muted text-foreground font-medium'
                    : 'bg-muted/60 text-muted-foreground group-hover:text-foreground'
                )}
              >
                {documentsCount}
              </span>
            ) : null}
          </button>
        </nav>
      </div>

      {/* Body */}
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
    </section>
  )
}
