'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { Button } from '@876/ui/button'
import { ChevronDown, CheckIcon } from '@876/ui/icons'
import { client } from '@/lib/client'
import type { RequestStatus } from '@/types/crm'
import { RequestStatusBadge } from './request-status-badge'

const STATUSES: { value: RequestStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export function QuickStatusSelector({
  requestId,
  currentStatus,
}: {
  requestId: string
  currentStatus: RequestStatus
}) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)

  async function handleStatusChange(status: RequestStatus) {
    if (status === currentStatus || updating) return
    setUpdating(true)

    const result = await client.requests.update(requestId, { status })
    if (result.error) {
      toast.error(result.error.message)
      setUpdating(false)
      return
    }

    toast.success(
      `Status updated to ${status.replaceAll('_', ' ').toLowerCase()}`
    )
    setUpdating(false)
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={updating}
            className="h-8 gap-1.5 px-2.5 font-normal"
          />
        }
      >
        <span className="text-muted-foreground text-xs">Status:</span>
        <RequestStatusBadge status={currentStatus} />
        <ChevronDown className="size-3.5 opacity-60" />
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
              <CheckIcon className="size-4 text-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
