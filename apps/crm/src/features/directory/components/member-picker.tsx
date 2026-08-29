'use client'

import { useMemo, useState } from 'react'

import { Button } from '@876/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@876/ui/command'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { CheckIcon, ChevronsUpDown, UserIcon } from '@876/ui/icons'
import { Popover, PopoverContent, PopoverTrigger } from '@876/ui/popover'

import type { DirectoryMember } from '../types'

type Props = {
  members: DirectoryMember[]
  value: string | null
  onSelect: (userId: string | null) => void
  exclude?: string[]
  placeholder: string
  emptyLabel: string
  allowUnassigned?: boolean
}

/**
 * Above this many selectable people the picker stops listing the directory on
 * open and waits for a query. Below it, listing everyone is faster than making
 * someone type to find one of a handful of names.
 */
const BROWSE_LIMIT = 8

/** Never render more than this many rows at once, however broad the query. */
const RESULT_LIMIT = 50

export function MemberPicker({
  members,
  value,
  onSelect,
  exclude = [],
  placeholder,
  emptyLabel,
  allowUnassigned = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const excluded = useMemo(() => new Set(exclude), [exclude])

  const selectable = useMemo(
    () => members.filter((member) => !excluded.has(member.userId)),
    [excluded, members]
  )

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const searchFirst = selectable.length > BROWSE_LIMIT
  const awaitingQuery = searchFirst && normalizedQuery.length === 0

  const matches = useMemo(() => {
    if (awaitingQuery) return []
    if (!normalizedQuery) return selectable

    return selectable.filter((member) =>
      `${member.name} ${member.email ?? ''}`
        .toLocaleLowerCase()
        .includes(normalizedQuery)
    )
  }, [awaitingQuery, normalizedQuery, selectable])

  const visibleMembers = matches.slice(0, RESULT_LIMIT)
  const overflow = matches.length - visibleMembers.length
  const selectedMember = members.find((member) => member.userId === value)

  function select(userId: string | null) {
    onSelect(userId)
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" />}
        className="w-full justify-between font-normal"
        aria-label={placeholder}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedMember ? (
            <CustomerAvatar
              name={selectedMember.name}
              src={selectedMember.avatar}
            />
          ) : null}
          <span
            className={selectedMember ? 'truncate' : 'text-muted-foreground'}
          >
            {selectedMember?.name ??
              (value === null && allowUnassigned ? 'Unassigned' : placeholder)}
          </span>
        </span>
        <ChevronsUpDown className="text-muted-foreground size-4" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-(--available-height) w-(--anchor-width) min-w-72 gap-0 overflow-hidden p-0"
      >
        <Command shouldFilter={false} className="min-h-0">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={searchFirst ? 'Search by name or email' : placeholder}
          />
          <CommandList className="min-h-0 flex-1">
            {awaitingQuery ? (
              <CommandEmpty>
                Search {selectable.length} people by name or email
              </CommandEmpty>
            ) : null}
            {!awaitingQuery && visibleMembers.length === 0 ? (
              <CommandEmpty>{emptyLabel}</CommandEmpty>
            ) : null}
            <CommandGroup>
              {allowUnassigned && !normalizedQuery ? (
                <CommandItem
                  value="unassigned"
                  data-checked={value === null}
                  onSelect={() => select(null)}
                >
                  <span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-md">
                    <UserIcon className="text-muted-foreground size-3.5" />
                  </span>
                  <span>Unassigned</span>
                  <CheckIcon
                    className={
                      value === null
                        ? 'ml-auto size-4'
                        : 'ml-auto size-4 opacity-0'
                    }
                  />
                </CommandItem>
              ) : null}
              {visibleMembers.map((member) => (
                <CommandItem
                  key={member.userId}
                  value={member.userId}
                  data-checked={value === member.userId}
                  onSelect={() => select(member.userId)}
                >
                  <CustomerAvatar name={member.name} src={member.avatar} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {member.name}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {member.email ?? '—'}
                    </span>
                  </span>
                  <CheckIcon
                    className={
                      value === member.userId
                        ? 'ml-auto size-4'
                        : 'ml-auto size-4 opacity-0'
                    }
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            {overflow > 0 ? (
              <p className="text-muted-foreground border-t px-3 py-2 text-xs">
                {overflow} more — keep typing to narrow the list.
              </p>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
