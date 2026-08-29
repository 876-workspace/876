'use client'

import { cn } from '@876/core/utils'
import { AppError } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { CheckIcon, ChevronDown } from '@876/ui/icons'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { client } from '@/lib/client'
import type { RequestStatus } from '@/types/crm'

import { RequestStatusBadge, requestStatusConfig } from './request-status-badge'

const STATUSES: { value: RequestStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
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
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<ErrorValue | null>(null)

  async function handleStatusChange(status: RequestStatus) {
    if (status === currentStatus || updating) return
    setUpdating(true)
    setError(null)

    const result = await client.requests.update(requestId, { status })
    if (result.error) {
      setError(result.error)
      setUpdating(false)
      return
    }

    toast.success(
      `Status updated to ${status.replaceAll('_', ' ').toLowerCase()}`
    )
    setUpdating(false)
    router.refresh()
  }

  const config = requestStatusConfig(currentStatus)
  const Icon = config.icon

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              disabled={updating}
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
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Update status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUSES.map((item) => (
            <DropdownMenuItem
              key={item.value}
              onClick={() => handleStatusChange(item.value)}
              className="flex items-center justify-between"
            >
              <RequestStatusBadge status={item.value} />
              {item.value === currentStatus ? (
                <CheckIcon className="text-primary size-4" />
              ) : null}
            </DropdownMenuItem>
          ))}
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
