'use client'

import { EyeSlashIcon, GlobeAltIcon, LockClosedIcon } from '../icons'
import { cn } from '../lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

export type NoteVisibility = 'PUBLIC' | 'INTERNAL' | 'PRIVATE'

const VISIBILITY_COPY = {
  PUBLIC: { label: 'Public note', icon: GlobeAltIcon },
  INTERNAL: { label: 'Internal note', icon: LockClosedIcon },
  PRIVATE: { label: 'Only me', icon: EyeSlashIcon },
} satisfies Record<NoteVisibility, { label: string; icon: typeof GlobeAltIcon }>

const VISIBILITY_CLASSES: Record<
  NoteVisibility,
  { trigger: string; icon: string; item: string }
> = {
  PUBLIC: {
    trigger: 'bg-info/10 ring-info/30',
    icon: 'bg-info/15 text-info',
    item: '',
  },
  INTERNAL: {
    trigger: 'bg-warning/[0.10] ring-warning/30',
    icon: 'bg-warning/15 text-warning',
    item: '',
  },
  PRIVATE: {
    trigger: 'bg-destructive/10 ring-destructive/30',
    icon: 'bg-destructive/15 text-destructive',
    item: 'text-destructive focus:bg-destructive/10 focus:text-destructive',
  },
}

function isNoteVisibility(value: unknown): value is NoteVisibility {
  return value === 'PUBLIC' || value === 'INTERNAL' || value === 'PRIVATE'
}

/** Selects the audience for a note, with an optional author-private choice. */
export function NoteVisibilitySelect({
  value,
  onValueChange,
  allowPrivate = false,
  disabled = false,
}: {
  value: NoteVisibility
  onValueChange: (value: NoteVisibility) => void
  allowPrivate?: boolean
  disabled?: boolean
}) {
  const selected = VISIBILITY_COPY[value]
  const SelectedIcon = selected.icon
  const options: NoteVisibility[] = allowPrivate
    ? ['PUBLIC', 'INTERNAL', 'PRIVATE']
    : ['PUBLIC', 'INTERNAL']

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (isNoteVisibility(next) && options.includes(next))
          onValueChange(next)
      }}
      disabled={disabled}
    >
      <SelectTrigger
        size="sm"
        aria-label="Note type"
        className={cn(
          'h-9 min-w-48 rounded-lg border-0 px-1.5 shadow-sm ring-1',
          VISIBILITY_CLASSES[value].trigger
        )}
      >
        <SelectValue className="sr-only" />
        <span className="flex min-w-0 items-center gap-2 pr-1">
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-md',
              VISIBILITY_CLASSES[value].icon
            )}
          >
            <SelectedIcon className="size-3.5" aria-hidden="true" />
          </span>
          <span className="text-xs font-semibold">{selected.label}</span>
        </span>
      </SelectTrigger>

      <SelectContent align="start" className="min-w-64 p-1.5">
        {options.map((option) => {
          const copy = VISIBILITY_COPY[option]
          const Icon = copy.icon

          return (
            <SelectItem
              key={option}
              value={option}
              className={cn(
                'rounded-md px-2.5 py-2',
                VISIBILITY_CLASSES[option].item
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-md',
                    VISIBILITY_CLASSES[option].icon
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                <span className="font-medium">{copy.label}</span>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
