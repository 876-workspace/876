'use client'

import { showAppErrorToast } from '@876/ui/app-error-toast'
import { Badge } from '@876/ui/badge'
import { Button, buttonVariants } from '@876/ui/button'
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { client } from '@/lib/client'
import type { RequestPriority } from '@/types/crm'

export function PrioritiesList({
  priorities,
}: {
  priorities: RequestPriority[]
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function toggleActive(priority: RequestPriority) {
    setBusyId(priority.id)
    const result = await client.requestPriorities.update(priority.id, {
      isActive: !priority.isActive,
    })
    setBusyId(null)

    if (result.error) {
      showAppErrorToast(result.error, {
        title: priority.isActive
          ? 'Priority could not be archived'
          : 'Priority could not be restored',
      })
      return
    }

    toast.success(priority.isActive ? 'Priority archived.' : 'Priority restored.')
    router.refresh()
  }

  if (priorities.length === 0)
    return (
      <Empty className="py-14">
        <EmptyHeader>
          <EmptyTitle>No priorities yet</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href="/settings/priorities/new"
            className={buttonVariants({ variant: 'info', size: 'sm' })}
          >
            Add
          </Link>
        </EmptyContent>
      </Empty>
    )

  return (
    <div className="876-card overflow-hidden">
      <ul className="divide-y">
        {priorities.map((priority) => (
          <li
            key={priority.id}
            className="flex flex-wrap items-center gap-4 px-5 py-4"
          >
            <span
              className="bg-muted size-3 shrink-0 rounded-full border"
              style={
                priority.color
                  ? { backgroundColor: priority.color, borderColor: priority.color }
                  : undefined
              }
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{priority.name}</span>
                {priority.isDefault ? <Badge variant="outline">Default</Badge> : null}
                <Badge variant={priority.isActive ? 'success' : 'secondary'}>
                  {priority.isActive ? 'Active' : 'Archived'}
                </Badge>
                {priority.provisioningKey ? (
                  <Badge variant="secondary">Provisioned</Badge>
                ) : null}
              </div>
              <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>Severity {priority.weight}</span>
                <span>Order {priority.sortOrder}</span>
                <span className="font-mono">{priority.slug}</span>
              </div>
              {priority.description ? (
                <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm">
                  {priority.description}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/settings/priorities/${priority.id}/edit`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Edit
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyId === priority.id || priority.isDefault}
                onClick={() => void toggleActive(priority)}
              >
                {busyId === priority.id
                  ? 'Saving…'
                  : priority.isActive
                    ? 'Archive'
                    : 'Restore'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
