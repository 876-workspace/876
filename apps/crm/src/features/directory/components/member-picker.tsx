'use client'

import { useMemo, useState } from 'react'

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@876/ui/combobox'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { UserIcon } from '@876/ui/icons'

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
 * Above this many selectable people the list stays closed until a query is
 * typed. Below it, listing everyone is faster than making someone type to find
 * one of a handful of names.
 */
const BROWSE_LIMIT = 8

/** Never render more than this many rows at once, however broad the query. */
const RESULT_LIMIT = 50

const UNASSIGNED_ID = '__unassigned__'

const UNASSIGNED_OPTION: DirectoryMember = {
  userId: UNASSIGNED_ID,
  name: 'Unassigned',
  email: null,
  avatar: null,
}

function memberLabel(member: DirectoryMember) {
  return member.email ? `${member.name} ${member.email}` : member.name
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
  const excluded = useMemo(() => new Set(exclude), [exclude])

  const selectable = useMemo(
    () => members.filter((member) => !excluded.has(member.userId)),
    [excluded, members]
  )

  const items = useMemo(
    () => (allowUnassigned ? [UNASSIGNED_OPTION, ...selectable] : selectable),
    [allowUnassigned, selectable]
  )

  const searchFirst = selectable.length > BROWSE_LIMIT

  const selected = useMemo(() => {
    if (value === null) return allowUnassigned ? UNASSIGNED_OPTION : null
    return items.find((member) => member.userId === value) ?? null
  }, [allowUnassigned, items, value])

  const [inputValue, setInputValue] = useState('')

  // Once an item is selected the input holds its label, which would otherwise
  // filter the list down to that one row when the popup is reopened.
  const query =
    selected && inputValue === selected.name ? '' : inputValue.trim()

  const visibleItems = useMemo(() => {
    const normalized = query.toLocaleLowerCase()

    if (!normalized) {
      // The list stays closed on a large directory until there is a query, but
      // "Unassigned" is an action rather than a person, so it stays reachable.
      if (searchFirst) return allowUnassigned ? [UNASSIGNED_OPTION] : []
      return items
    }

    return selectable
      .filter((member) =>
        memberLabel(member).toLocaleLowerCase().includes(normalized)
      )
      .slice(0, RESULT_LIMIT)
  }, [allowUnassigned, items, query, searchFirst, selectable])

  return (
    <Combobox
      items={visibleItems}
      value={selected}
      onValueChange={(next) => {
        const member = next as DirectoryMember | null
        if (!member || member.userId === UNASSIGNED_ID) {
          onSelect(null)
          return
        }
        onSelect(member.userId)
      }}
      itemToStringLabel={(member: DirectoryMember) => member.name}
      isItemEqualToValue={(a: DirectoryMember, b: DirectoryMember) =>
        a.userId === b.userId
      }
      filter={null}
      onInputValueChange={(next) => setInputValue(next)}
    >
      <ComboboxInput
        placeholder={
          searchFirst ? `Search ${selectable.length} people` : placeholder
        }
        aria-label={placeholder}
      />

      <ComboboxContent>
        <ComboboxEmpty>
          {searchFirst
            ? `Type to search ${selectable.length} people`
            : emptyLabel}
        </ComboboxEmpty>
        <ComboboxList>
          {(member: DirectoryMember) =>
            member.userId === UNASSIGNED_ID ? (
              <ComboboxItem key={member.userId} value={member}>
                <span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-md">
                  <UserIcon className="text-muted-foreground size-3.5" />
                </span>
                <span>Unassigned</span>
              </ComboboxItem>
            ) : (
              <ComboboxItem key={member.userId} value={member}>
                <CustomerAvatar name={member.name} src={member.avatar} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {member.name}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {member.email ?? '—'}
                  </span>
                </span>
              </ComboboxItem>
            )
          }
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
