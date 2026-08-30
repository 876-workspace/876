'use client'

import { cn } from '@876/core/utils'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { ChevronDown } from '@876/ui/icons'
import { useRouter } from 'next/navigation'
import { Fragment, useState } from 'react'
import { toast } from 'sonner'

import { client } from '@/lib/client'
import type { RequestStatus } from '@/types/crm'

import { requestStatusConfig } from './request-status-badge'

const STATUS_GROUPS: RequestStatus[][] = [
  ['OPEN', 'IN_PROGRESS', 'WAITING'],
  ['RESOLVED', 'CLOSED', 'CANCELLED'],
]

type ErrorValue = { code: string; message: string }

export function QuickStatusSelector({
  requestId,
  currentStatus,
}: {
  requestId: string
  currentStatus: RequestStatus
}) {
  const router = useRouter()
  const [pending, setPending] = useState<RequestStatus | null>(null)
  const [error, setError] = useState<ErrorValue | null>(null)

  /** Show the chosen status straight away; the refresh confirms it. */
  const shown = pending ?? currentStatus
  const config = requestStatusConfig(shown)
  const Icon = config.icon

  async function handleStatusChange(status: RequestStatus) {
    if (status === currentStatus || pending) return
    setPending(status)
    setError(null)

    const result = await client.requests.update(requestId, { status })

    if (result.error) {
      setError(result.error)
      setPending(null)
      return
    }

    toast.success(`Status updated to ${requestStatusConfig(status).label}`)
    setPending(null)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              disabled={pending !== null}
              aria-label={`Status: ${config.label}. Change status`}
              className={cn(
                'h-8 gap-1.5 px-2.5 text-xs font-medium',
                config.trigger
              )}
            />
          }
        >
          <Icon className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{config.label}</span>
          <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuLabel>Update status</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={currentStatus}
            onValueChange={(value) =>
              handleStatusChange(value as RequestStatus)
            }
          >
            {STATUS_GROUPS.map((statuses, groupIndex) => (
              <Fragment key={groupIndex}>
                {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
                {statuses.map((status) => {
                  const item = requestStatusConfig(status)
                  return (
                    <DropdownMenuRadioItem
                      key={status}
                      value={status}
                      className="gap-2.5 py-2"
                    >
                      <span
                        className={cn('size-2 shrink-0 rounded-full', item.dot)}
                        aria-hidden="true"
                      />
                      {item.label}
                    </DropdownMenuRadioItem>
                  )
                })}
              </Fragment>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {error ? (
        <AppError
          title="Status could not be updated"
          error={error}
          variant="inline"
        />
      ) : null}
    </div>
  )
}
