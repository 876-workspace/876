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
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { ChevronDown, Loader2Icon, TagIcon } from '@876/ui/icons'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { priorityColorVariant } from '@/features/priorities/priority-color'
import { client } from '@/lib/client'
import type { RequestPriority } from '@/types/crm'

type ErrorValue = { code: string; message: string }

/**
 * Changing a request's priority is the same shape of decision as changing its
 * status, so it is the same control — a trigger that carries the current value
 * and a menu of the alternatives.
 */
export function QuickPrioritySelector({
  requestId,
  currentPriorityId,
  priorities,
}: {
  requestId: string
  currentPriorityId: string
  priorities: RequestPriority[]
}) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<ErrorValue | null>(null)

  const shownId = pending ?? currentPriorityId
  const shown = priorities.find((priority) => priority.id === shownId)
  const variant = priorityColorVariant(shown?.color)

  if (priorities.length === 0) return null

  async function handleChange(priorityId: string) {
    if (priorityId === currentPriorityId || pending) return
    setPending(priorityId)
    setError(null)

    const result = await client.requests.update(requestId, { priorityId })

    if (result.error) {
      setError(result.error)
      setPending(null)
      return
    }

    const next = priorities.find((priority) => priority.id === priorityId)
    toast.success(`Priority set to ${next?.name ?? 'updated'}`)
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
              aria-label={`Priority: ${shown?.name ?? 'none'}. Change priority`}
              className="h-8 max-w-40 gap-1.5 px-2.5 text-xs font-medium"
            />
          }
        >
          {pending ? (
            <Loader2Icon
              className="size-3.5 shrink-0 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <TagIcon
              className={cn('size-3.5 shrink-0', variant.text)}
              aria-hidden="true"
            />
          )}
          <span className="truncate">{shown?.name ?? 'Priority'}</span>
          <ChevronDown
            className="size-3.5 shrink-0 opacity-70"
            aria-hidden="true"
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuLabel>Set priority</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={currentPriorityId}
            onValueChange={handleChange}
          >
            {priorities.map((priority) => (
              <DropdownMenuRadioItem
                key={priority.id}
                value={priority.id}
                className="gap-2.5 py-2"
              >
                <TagIcon
                  className={cn(
                    'size-4 shrink-0',
                    priorityColorVariant(priority.color).text
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{priority.name}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {error ? (
        <AppError
          title="Priority could not be updated"
          error={error}
          variant="inline"
        />
      ) : null}
    </div>
  )
}
