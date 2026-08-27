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
  const visibleMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()

    return members.filter((member) => {
      if (excluded.has(member.userId)) return false
      if (!normalizedQuery) return true

      return `${member.name} ${member.email ?? ''}`
        .toLocaleLowerCase()
        .includes(normalizedQuery)
    })
  }, [excluded, members, query])
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
        className="w-(--anchor-width) min-w-72 gap-0 p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={placeholder}
          />
          <CommandList>
            {visibleMembers.length === 0 ? (
              <CommandEmpty>{emptyLabel}</CommandEmpty>
            ) : null}
            <CommandGroup>
              {allowUnassigned ? (
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
