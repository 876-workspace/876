'use client'

import { Textarea } from '@876/ui/textarea'
import { useId, useRef, useState } from 'react'

export type MentionPerson = {
  userId: string
  label: string
}

type MentionInputProps = {
  name: string
  people: readonly MentionPerson[]
  defaultValue?: string
  placeholder?: string
  label?: string
  rows?: number
}

const TRIGGER_PATTERN = /(?:^|\s)@([A-Za-z0-9_.-]*)$/

function findQuery(beforeCursor: string): string | null {
  const match = TRIGGER_PATTERN.exec(beforeCursor)
  if (match === null) {
    return null
  }
  return match[1] ?? ''
}

export function MentionInput({
  name,
  people,
  defaultValue = '',
  placeholder,
  label = 'Message',
  rows = 4,
}: MentionInputProps) {
  const [value, setValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const listboxId = useId()

  const normalizedQuery = query.toLowerCase()
  const matches = people.filter((person) =>
    person.label.toLowerCase().includes(normalizedQuery)
  )
  const listOpen = open && matches.length > 0

  function syncQuery(next: string, cursor: number) {
    const found = findQuery(next.slice(0, cursor))
    if (found === null) {
      setOpen(false)
      setQuery('')
    } else {
      setOpen(true)
      setQuery(found)
      setActiveIndex(0)
    }
  }

  function insertPerson(person: MentionPerson) {
    const textarea = textareaRef.current
    const cursor = textarea?.selectionStart ?? value.length
    const before = value.slice(0, cursor)
    const triggerStart = before.lastIndexOf(`@${query}`)
    const start = triggerStart === -1 ? cursor : triggerStart
    const token = `@[${person.label}](user:${person.userId}) `
    const next = `${value.slice(0, start)}${token}${value.slice(cursor)}`
    setValue(next)
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
    const nextCursor = start + token.length
    requestAnimationFrame(() => {
      const node = textareaRef.current
      if (node !== null) {
        node.focus()
        node.setSelectionRange(nextCursor, nextCursor)
      }
    })
  }

  return (
    <div data-slot="mention-input" className="relative space-y-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <Textarea
        ref={textareaRef}
        id={name}
        name={name}
        aria-label={label}
        placeholder={placeholder}
        rows={rows}
        autoComplete="off"
        value={value}
        aria-expanded={listOpen}
        aria-controls={listboxId}
        aria-activedescendant={
          listOpen ? `${listboxId}-option-${activeIndex}` : undefined
        }
        onChange={(event) => {
          const next = event.target.value
          setValue(next)
          syncQuery(next, event.target.selectionStart ?? next.length)
        }}
        onKeyDown={(event) => {
          if (!listOpen) {
            return
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActiveIndex((index) => (index + 1) % matches.length)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex(
              (index) => (index - 1 + matches.length) % matches.length
            )
          } else if (event.key === 'Enter') {
            event.preventDefault()
            const person = matches[activeIndex]
            if (person !== undefined) {
              insertPerson(person)
            }
          } else if (event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)
            setQuery('')
          }
        }}
      />
      {listOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Mention suggestions"
          className="bg-popover absolute z-10 max-h-48 w-full overflow-auto rounded-md border shadow-md"
        >
          {matches.map((person, index) => (
            <li
              key={person.userId}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={
                index === activeIndex
                  ? 'bg-accent px-3 py-2 text-sm'
                  : 'px-3 py-2 text-sm'
              }
              onMouseDown={(event) => {
                event.preventDefault()
                insertPerson(person)
              }}
            >
              {person.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
