'use client'

import { useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { AdminProvisioningSetup } from '@876/platform/compat'
import { cn } from '@876/core/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { getResourceTypeIcon } from '@/features/provisioning/finance-provisioning-utils'
import { Trash, XIcon } from '@876/ui/icons'
import { client } from '@/lib/client'

type ResourceTypeTab = {
  key: string
  label: string
}

export function SetupCardFrame({
  setup,
  resourceTypes,
  children,
}: {
  setup: AdminProvisioningSetup
  resourceTypes: ResourceTypeTab[]
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const base = `/settings/orgs/provisioning/${encodeURIComponent(setup.key)}`

  function handleDelete() {
    startTransition(async () => {
      const { error } = await client.provisioningSetups.update(setup.key, {
        status: 'archived',
      })
      if (error) {
        return
      }
      setDeleteDialogOpen(false)
      router.push('/settings/orgs/provisioning')
      router.refresh()
    })
  }

  return (
    <section
      aria-label={`Provisioning setup: ${setup.name}`}
      className={cn(
        '876-card flex h-full min-w-0 flex-col overflow-hidden',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300 motion-safe:ease-out'
      )}
    >
      {/* Header */}
      <header className="border-876-surface-border flex shrink-0 items-center gap-4 border-b px-6 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-foreground truncate text-lg font-semibold tracking-tight sm:text-xl">
              {setup.name}
            </h2>
            {setup.is_default ? <Badge variant="info">Default</Badge> : null}
            {setup.status === 'archived' ? (
              <Badge variant="secondary">Archived</Badge>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setDeleteDialogOpen(true)}
            aria-label={`Delete ${setup.name} setup`}
            disabled={setup.is_default || isPending}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive size-8 shrink-0"
          >
            <Trash className="text-destructive size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push('/settings/orgs/provisioning')}
            aria-label="Close provisioning setup"
            className="text-muted-foreground hover:text-foreground size-8 shrink-0"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </header>

      {/* Delete / Archive Setup Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <Trash className="text-destructive size-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>Archive setup?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{setup.name}</strong>? It
              will no longer be available for new organization provisioning.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending ? 'Archiving…' : 'Archive setup'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resource type tabs */}
      {resourceTypes.length > 0 && (
        <div className="border-876-surface-border shrink-0 border-b px-6 pt-1">
          <nav
            aria-label="Resource categories"
            className="no-scrollbar -mb-px flex items-end gap-0.5 overflow-x-auto"
          >
            {resourceTypes.map((tab) => {
              const Icon = getResourceTypeIcon(tab.key)
              const isRootTab = tab.key === 'workspace'
              const href = isRootTab ? base : `${base}/${encodeURIComponent(tab.key)}`
              const isActive = isRootTab
                ? pathname === base
                : pathname === href || pathname.startsWith(`${href}/`)

              return (
                <Link
                  key={tab.key}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-2 border-b-2 px-3.5 py-3 text-[0.8125rem] font-medium whitespace-nowrap transition-all',
                    isActive
                      ? 'border-foreground text-foreground font-semibold'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'size-3.5 shrink-0 transition-colors',
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground/70 group-hover:text-foreground'
                    )}
                  />
                  <span>{tab.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      )}

      {/* Body */}
      <div className="876-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>

      {/* Footer */}
      <footer className="border-876-surface-border bg-muted/30 text-muted-foreground shrink-0 border-t px-6 py-2.5 font-mono text-xs">
        {setup.id}
      </footer>
    </section>
  )
}
