'use client'

import { Textarea } from '@876/ui/textarea'
import { useMemo, useRef, useState } from 'react'

export type MentionMember = {
  userId: string
  label: string
}

type MentionInputProps = {
  id: string
  name: string
  value: string
  onValueChange: (value: string) => void
  members: readonly MentionMember[]
  placeholder?: string
  minRows?: number
  disabled?: boolean
  required?: boolean
}

type ActiveMention = {
  start: number
  query: string
}

function findActiveMention(value: string, cursor: number): ActiveMention | null {
  const before = value.slice(0, cursor)
  const match = /@([\p{L}\p{N}._-]*)$/u.exec(before)
  if (!match) return null
  const at = cursor - match[0].length
  if (at > 0 && !/[\s(]/.test(before[at - 1] ?? '')) return null
  return { start: at, query: match[1] ?? '' }
}

function toMentionToken(member: MentionMember): string {
  return `@[${member.label}](user:${member.userId})`
}

/**
 * Markdown textarea with `@`-mention autocomplete over project members.
 *
 * Mentions are stored as `@[label](user:<userId>)` tokens, which the
 * service parses server-side into notifications and follows. Free-text
 * `@name` matches are never sent: only a picked suggestion becomes a
 * token, so what the writer sees is exactly what notifies.
 */
export function MentionInput({
  id,
  name,
  value,
  onValueChange,
  members,
  placeholder,
  minRows = 5,
  disabled,
  required,
}: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [cursor, setCursor] = useState<number | null>(null)
  const [highlight, setHighlight] = useState(0)

  const mention = cursor === null ? null : findActiveMention(value, cursor)

  const suggestions = useMemo(() => {
    if (!mention) return []
    const query = mention.query.toLowerCase()
    return members
      .filter((member) => member.label.toLowerCase().includes(query))
      .slice(0, 8)
  }, [mention, members])

  function syncCursor() {
    const textarea = textareaRef.current
    setCursor(textarea ? (textarea.selectionStart ?? value.length) : null)
  }

  function insert(member: MentionMember) {
    if (!mention) return
    const textarea = textareaRef.current
    const end = textarea ? (textarea.selectionStart ?? value.length) : value.length
    const token = `${toMentionToken(member)} `
    const next = `${value.slice(0, mention.start)}${token}${value.slice(end)}`
    onValueChange(next)
    setCursor(null)
    setHighlight(0)
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      const position = mention.start + token.length
      el.focus()
      el.setSelectionRange(position, position)
    })
  }

  return (
    <div data-slot="mention-input" className="space-y-2">
      <Textarea
        ref={textareaRef}
        id={id}
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        rows={minRows}
        placeholder={placeholder ?? 'Write in Markdown. Type @ to mention a teammate.'}
        onChange={(event) => {
          onValueChange(event.target.value)
          setCursor(event.target.selectionStart ?? event.target.value.length)
        }}
        onSelect={syncCursor}
        onKeyDown={(event) => {
          if (!mention || suggestions.length === 0) {
            if (event.key === 'Escape') setCursor(null)
            return
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setHighlight((current) => (current + 1) % suggestions.length)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setHighlight(
              (current) =>
                (current - 1 + suggestions.length) % suggestions.length
            )
          } else if (event.key === 'Enter' || event.key === 'Tab') {
            const picked = suggestions[highlight]
            if (picked) {
              event.preventDefault()
              insert(picked)
            }
          } else if (event.key === 'Escape') {
            setCursor(null)
          }
        }}
        onBlur={() => {
          window.setTimeout(() => setCursor(null), 120)
        }}
      />
      {mention && suggestions.length > 0 ? (
        <ul
          data-slot="mention-suggestions"
          role="listbox"
          aria-label="Mention suggestions"
          className="rounded-md border p-1"
        >
          {suggestions.map((member, index) => (
            <li key={member.userId} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                className={`w-full rounded px-2 py-1 text-left text-sm ${index === highlight ? 'bg-accent' : ''}`}
                onMouseDown={(event) => {
                  event.preventDefault()
                  insert(member)
                }}
                onMouseEnter={() => setHighlight(index)}
              >
                {member.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
