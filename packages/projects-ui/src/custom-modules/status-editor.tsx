'use client'

import { useState } from 'react'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import type { CustomModuleStatus } from './types'

export type StatusEditorProps = {
  initial: readonly CustomModuleStatus[]
}

type StatusDraft = {
  key: string
  label: string
  category: CustomModuleStatus['category']
}

const CATEGORIES: { value: CustomModuleStatus['category']; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
]

function domId(index: number, field: string): string {
  return `status-${index}-${field}`.replace(/[^a-zA-Z0-9_-]/g, '-')
}

function toDraft(status: CustomModuleStatus): StatusDraft {
  return { key: status.key, label: status.label, category: status.category }
}

function toStatus(draft: StatusDraft, position: number): CustomModuleStatus {
  return {
    key: draft.key,
    label: draft.label,
    category: draft.category,
    position,
  }
}

function nextKey(taken: string[]): string {
  let index = taken.length + 1
  while (taken.includes(`status-${index}`)) index += 1
  return `status-${index}`
}

/**
 * Edits a module's status pipeline and posts the ordered list as JSON in a
 * `statuses` field, which is exactly what the API stores.
 */
export function StatusEditor({ initial }: StatusEditorProps) {
  const [statuses, setStatuses] = useState<StatusDraft[]>(() =>
    [...initial]
      .sort((a, b) => a.position - b.position)
      .map(toDraft)
  )

  const serialized = JSON.stringify(
    statuses.map((draft, index) => toStatus(draft, index))
  )

  function updateStatus(index: number, patch: Partial<StatusDraft>) {
    setStatuses((current) =>
      current.map((status, position) =>
        position === index ? { ...status, ...patch } : status
      )
    )
  }

  function addStatus() {
    setStatuses((current) => {
      const taken = current.map((status) => status.key)
      const key = nextKey(taken)
      return [...current, { key, label: key, category: 'open' as const }]
    })
  }

  function removeStatus(index: number) {
    setStatuses((current) => current.filter((_, position) => position !== index))
  }

  function moveStatus(index: number, offset: number) {
    setStatuses((current) => {
      const target = index + offset
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next
    })
  }

  return (
    <div data-slot="status-editor" className="flex flex-col gap-4">
      <input type="hidden" name="statuses" value={serialized} readOnly />

      {statuses.length === 0 ? (
        <p className="text-muted-foreground text-sm">No statuses yet.</p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {statuses.map((status, index) => (
          <li
            key={`${index}-${status.key}`}
            data-slot="status-editor-row"
            className="flex flex-col gap-3 rounded-md border p-3"
          >
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-36 flex-1">
                <Label htmlFor={domId(index, 'key')}>Key</Label>
                <Input
                  id={domId(index, 'key')}
                  value={status.key}
                  onChange={(event) =>
                    updateStatus(index, { key: event.target.value })
                  }
                />
              </div>
              <div className="min-w-36 flex-1">
                <Label htmlFor={domId(index, 'label')}>Label</Label>
                <Input
                  id={domId(index, 'label')}
                  value={status.label}
                  onChange={(event) =>
                    updateStatus(index, { label: event.target.value })
                  }
                />
              </div>
              <div className="min-w-36 flex-1">
                <Label htmlFor={domId(index, 'category')}>Category</Label>
                <NativeSelect
                  id={domId(index, 'category')}
                  value={status.category}
                  onChange={(event) =>
                    updateStatus(index, {
                      category: event.target
                        .value as CustomModuleStatus['category'],
                    })
                  }
                >
                  {CATEGORIES.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === 0}
                onClick={() => moveStatus(index, -1)}
              >
                Move up
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === statuses.length - 1}
                onClick={() => moveStatus(index, 1)}
              >
                Move down
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeStatus(index)}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div>
        <Button type="button" variant="outline" size="sm" onClick={addStatus}>
          Add status
        </Button>
      </div>
    </div>
  )
}
