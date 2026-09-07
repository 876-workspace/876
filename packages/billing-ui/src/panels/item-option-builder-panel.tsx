'use client'

import type { ReactNode } from 'react'

import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'

export interface ItemOptionDraft {
  id: string
  name: string
  values: string[]
}

export type ItemOptionBuilderState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty'; options: ItemOptionDraft[] }
  | { status: 'ready'; options: ItemOptionDraft[] }

export interface ItemOptionBuilderPanelProps {
  state: ItemOptionBuilderState
  onChange: (options: ItemOptionDraft[]) => void
}

const MAX_OPTIONS = 3

function normalise(value: string) {
  return value.trim().toLocaleLowerCase()
}

export function itemVariantCount(options: readonly ItemOptionDraft[]) {
  const usable = options.filter(
    (option) =>
      option.name.trim() && option.values.some((value) => value.trim())
  )
  return usable.reduce(
    (count, option) =>
      count * new Set(option.values.map(normalise).filter(Boolean)).size,
    1
  )
}

export function ItemOptionBuilderPanel({
  state,
  onChange,
}: ItemOptionBuilderPanelProps) {
  const options =
    state.status === 'ready' || state.status === 'empty' ? state.options : []
  const variantCount = itemVariantCount(options)

  if (state.status === 'loading')
    return (
      <ItemOptionBuilderFrame>
        <div className="bg-muted h-20 animate-pulse rounded-md" />
      </ItemOptionBuilderFrame>
    )
  if (state.status === 'error')
    return (
      <ItemOptionBuilderFrame>
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      </ItemOptionBuilderFrame>
    )

  function replace(index: number, option: ItemOptionDraft) {
    onChange(
      options.map((current, position) =>
        position === index ? option : current
      )
    )
  }

  function addOption() {
    if (options.length >= MAX_OPTIONS) return
    onChange([
      ...options,
      { id: `option-${crypto.randomUUID()}`, name: '', values: [''] },
    ])
  }

  return (
    <ItemOptionBuilderFrame>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground text-sm tabular-nums">
          {variantCount} {variantCount === 1 ? 'variant' : 'variants'}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addOption}
          disabled={options.length >= MAX_OPTIONS}
        >
          Add option
        </Button>
      </div>
      {options.map((option, index) => {
        const names = options
          .filter((_, position) => position !== index)
          .map((entry) => normalise(entry.name))
        const duplicateName =
          Boolean(option.name.trim()) && names.includes(normalise(option.name))
        return (
          <div
            key={option.id}
            className="border-border space-y-3 border-t pt-4"
          >
            <div className="flex gap-2">
              <Input
                aria-label={`Option ${index + 1} name`}
                value={option.name}
                placeholder="Option name"
                onChange={(event) =>
                  replace(index, { ...option, name: event.target.value })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange(options.filter((_, position) => position !== index))
                }
              >
                Remove
              </Button>
            </div>
            {duplicateName ? (
              <p role="alert" className="text-destructive text-xs">
                Option names must be unique.
              </p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {option.values.map((value, valueIndex) => {
                const duplicateValue =
                  Boolean(value.trim()) &&
                  option.values.some(
                    (other, otherIndex) =>
                      otherIndex !== valueIndex &&
                      normalise(other) === normalise(value)
                  )
                return (
                  <div key={`${option.id}-${valueIndex}`}>
                    <div className="flex gap-1">
                      <Input
                        aria-label={`${option.name || `Option ${index + 1}`} value ${valueIndex + 1}`}
                        value={value}
                        placeholder="Value"
                        onChange={(event) =>
                          replace(index, {
                            ...option,
                            values: option.values.map((current, position) =>
                              position === valueIndex
                                ? event.target.value
                                : current
                            ),
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${option.name || 'option'} value ${valueIndex + 1}`}
                        onClick={() =>
                          replace(index, {
                            ...option,
                            values: option.values.filter(
                              (_, position) => position !== valueIndex
                            ),
                          })
                        }
                      >
                        ×
                      </Button>
                    </div>
                    {duplicateValue ? (
                      <p role="alert" className="text-destructive mt-1 text-xs">
                        Values must be unique.
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                replace(index, { ...option, values: [...option.values, ''] })
              }
            >
              Add value
            </Button>
          </div>
        )
      })}
    </ItemOptionBuilderFrame>
  )
}

function ItemOptionBuilderFrame({ children }: { children: ReactNode }) {
  return (
    <section className="876-card space-y-4 p-5">
      <h2 className="876-section-title">Options</h2>
      {children}
    </section>
  )
}
