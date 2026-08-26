'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminProvisioningSetup } from '@876/admin'
import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { MoreHorizontalIcon, Pencil } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import Link from 'next/link'

import { client } from '@/lib/client'

export function SetupHeader({ setup }: { setup: AdminProvisioningSetup }) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update(
    params: Parameters<typeof client.provisioningSetups.update>[1],
    failure: string
  ) {
    setMessage(null)
    startTransition(async () => {
      const { data, error } = await client.provisioningSetups.update(
        setup.key,
        params
      )
      if (error || !data) {
        setMessage(error?.message ?? failure)
        return
      }
      router.refresh()
    })
  }

  return (
    <section className="876-card space-y-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="876-page-title">{setup.name}</h1>
            {setup.is_default ? <Badge variant="info">Default</Badge> : null}
            {setup.status === 'archived' ? (
              <Badge variant="secondary">Archived</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-1 text-[0.8125rem]">
            <span className="font-mono">{setup.manifest_target}</span>
            {' · '}
            {setup.country_code ?? '—'} · {setup.currency_code ?? '—'} ·{' '}
            {setup.organization_count} organization(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/settings/orgs/provisioning/${encodeURIComponent(setup.key)}/edit`}
            className={buttonVariants({ variant: 'outline' })}
          >
            <Pencil className="size-3.5" />
            Edit
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'outline', size: 'icon-sm' })
              )}
              disabled={isPending}
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-44">
              <DropdownMenuItem
                disabled={setup.is_default || setup.status !== 'active'}
                onClick={() =>
                  update(
                    { is_default: true },
                    'Failed to make this setup the default.'
                  )
                }
              >
                Make default
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {setup.status === 'active' ? (
                <DropdownMenuItem
                  variant="destructive"
                  disabled={setup.is_default || setup.organization_count > 0}
                  onClick={() =>
                    update(
                      { status: 'archived' },
                      'Failed to archive this setup.'
                    )
                  }
                >
                  Archive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() =>
                    update(
                      { status: 'active' },
                      'Failed to restore this setup.'
                    )
                  }
                >
                  Restore
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {setup.description ? (
        <p className="text-muted-foreground text-[0.8125rem]">
          {setup.description}
        </p>
      ) : null}
      {message ? <p className="text-destructive text-sm">{message}</p> : null}
    </section>
  )
}
