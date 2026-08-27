'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

import { Button } from '@876/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import { XMarkIcon } from '@876/ui/icons'

export type FilterDepartment = {
  id: string
  name: string
}

export type FilterMember = {
  id: string
  userId: string
  name: string
  email: string | null
  /** Picture URL from the member's 876 account, when they have one. */
  avatar: string | null
}

interface Props {
  selectedTeam: string
  selectedAssignee: string
  departments: FilterDepartment[]
  members: FilterMember[]
}

export function RequestsFilterBar({
  selectedTeam,
  selectedAssignee,
  departments,
  members,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams)
      if (!value || value === 'all') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      startTransition(() => {
        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    },
    [router, pathname, searchParams]
  )

  const clearAllFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams)
    params.delete('team')
    params.delete('assignee')
    startTransition(() => {
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }, [router, pathname, searchParams])

  const isFiltered = selectedTeam !== 'all' || selectedAssignee !== 'all'

  return (
    <div
      data-pending={isPending ? '' : undefined}
      className="flex flex-wrap items-center gap-2 text-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Team Dropdown Filter */}
        {departments.length > 0 && (
          <div className="flex items-center">
            <Select
              value={selectedTeam}
              onValueChange={(val) => setParam('team', val ?? 'all')}
            >
              <SelectTrigger size="sm" className="h-8 text-xs">
                <span className="text-muted-foreground mr-1">Team:</span>
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All teams</SelectItem>
                <SelectItem value="none">No team assigned</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Assignee filter */}
        {members.length > 0 && (
          <div className="flex items-center">
            <Select
              value={selectedAssignee}
              onValueChange={(val) => setParam('assignee', val ?? 'all')}
            >
              <SelectTrigger size="sm" className="h-8 text-xs">
                <span className="text-muted-foreground mr-1">Assignee:</span>
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All members</SelectItem>
                <SelectItem value="me">Assigned to me</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Clear Filters Button */}
        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground h-8 gap-1 px-2 text-xs"
          >
            <XMarkIcon className="size-3.5" />
            Reset filters
          </Button>
        )}
      </div>
    </div>
  )
}
