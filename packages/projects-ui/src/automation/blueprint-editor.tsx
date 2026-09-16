'use client'

import { useState } from 'react'

import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import type { Blueprint, Transition } from './types'

export type BlueprintStateOption = { key: string; label: string }

export type BlueprintEditorProps = {
  initial: Blueprint
  availableStates: readonly BlueprintStateOption[]
  availableFieldKeys: readonly string[]
  permissionOptions: readonly string[]
}

function domId(...parts: string[]): string {
  return parts.join('-').replace(/[^a-zA-Z0-9_-]/g, '-')
}

function stateLabel(
  key: string,
  states: readonly BlueprintStateOption[]
): string {
  return states.find((state) => state.key === key)?.label ?? key
}

function createTransition(
  states: readonly BlueprintStateOption[]
): Transition {
  return {
    id: null,
    fromStateKey: null,
    toStateKey: states[0]?.key ?? '',
    name: '',
    requiredPermission: null,
    requiredFieldKeys: [],
    requiresComment: false,
  }
}

/**
 * Edits a work-item-type blueprint as a set of transition rows and posts them
 * as JSON in a `transitions` field, mirroring the layout editor's hidden-input
 * serialization pattern.
 */
export function BlueprintEditor({
  initial,
  availableStates,
  availableFieldKeys,
  permissionOptions,
}: BlueprintEditorProps) {
  const [transitions, setTransitions] = useState<Transition[]>(
    () => initial.transitions
  )

  const serialized = JSON.stringify(transitions)

  function updateTransition(
    index: number,
    patch: Partial<Transition>
  ): void {
    setTransitions((current) =>
      current.map((transition, position) =>
        position === index ? { ...transition, ...patch } : transition
      )
    )
  }

  function toggleRequiredField(index: number, fieldKey: string): void {
    setTransitions((current) =>
      current.map((transition, position) => {
        if (position !== index) return transition
        const has = transition.requiredFieldKeys.includes(fieldKey)
        return {
          ...transition,
          requiredFieldKeys: has
            ? transition.requiredFieldKeys.filter((key) => key !== fieldKey)
            : [...transition.requiredFieldKeys, fieldKey],
        }
      })
    )
  }

  function addTransition(): void {
    setTransitions((current) => [...current, createTransition(availableStates)])
  }

  function removeTransition(index: number): void {
    setTransitions((current) =>
      current.filter((_, position) => position !== index)
    )
  }

  const grouped = availableStates.map((state) => ({
    state,
    rows: transitions
      .map((transition, index) => ({ transition, index }))
      .filter(({ transition }) => transition.toStateKey === state.key),
  }))
  const orphaned = transitions
    .map((transition, index) => ({ transition, index }))
    .filter(
      ({ transition }) =>
        !availableStates.some((state) => state.key === transition.toStateKey)
    )

  return (
    <div data-slot="blueprint-editor" className="flex flex-col gap-6">
      <input type="hidden" name="transitions" value={serialized} readOnly />

      {transitions.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No transitions yet. All state changes stay allowed until the first
          transition is added.
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {grouped.map(({ state, rows }) => (
          <section
            key={state.key}
            data-slot="blueprint-editor-column"
            data-state={state.key}
            className="flex flex-col gap-2 rounded-md border p-3"
          >
            <h3 className="text-sm font-medium">To {state.label}</h3>
            {rows.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No transitions into this state.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {rows.map(({ transition, index }) => (
                  <li
                    key={index}
                    data-slot="blueprint-editor-transition-summary"
                    className="text-xs"
                  >
                    {transition.fromStateKey === null
                      ? 'Any'
                      : stateLabel(transition.fromStateKey, availableStates)}{' '}
                    → {state.label}
                    {transition.name ? ` · ${transition.name}` : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {orphaned.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          {orphaned.length} transition{orphaned.length === 1 ? '' : 's'} target
          an unknown state.
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Transitions</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTransition}
          >
            Add transition
          </Button>
        </div>

        {transitions.map((transition, index) => (
          <div
            key={index}
            data-slot="blueprint-editor-transition"
            className="flex flex-col gap-3 rounded-md border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">
                Transition {index + 1}
              </span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeTransition(index)}
              >
                Remove
              </Button>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor={domId('transition', String(index), 'from')}>
                  From
                </Label>
                <NativeSelect
                  id={domId('transition', String(index), 'from')}
                  aria-label={`Transition ${index + 1} from state`}
                  value={transition.fromStateKey ?? ''}
                  onChange={(event) =>
                    updateTransition(index, {
                      fromStateKey: event.target.value || null,
                    })
                  }
                >
                  <NativeSelectOption value="">Any state</NativeSelectOption>
                  {availableStates.map((state) => (
                    <NativeSelectOption key={state.key} value={state.key}>
                      {state.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor={domId('transition', String(index), 'to')}>
                  To
                </Label>
                <NativeSelect
                  id={domId('transition', String(index), 'to')}
                  aria-label={`Transition ${index + 1} to state`}
                  value={transition.toStateKey}
                  onChange={(event) =>
                    updateTransition(index, { toStateKey: event.target.value })
                  }
                >
                  {availableStates.map((state) => (
                    <NativeSelectOption key={state.key} value={state.key}>
                      {state.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="min-w-40 flex-1">
                <Label htmlFor={domId('transition', String(index), 'name')}>
                  Name
                </Label>
                <Input
                  id={domId('transition', String(index), 'name')}
                  aria-label={`Transition ${index + 1} name`}
                  value={transition.name}
                  onChange={(event) =>
                    updateTransition(index, { name: event.target.value })
                  }
                />
              </div>
              <div>
                <Label
                  htmlFor={domId('transition', String(index), 'permission')}
                >
                  Required permission
                </Label>
                <NativeSelect
                  id={domId('transition', String(index), 'permission')}
                  aria-label={`Transition ${index + 1} required permission`}
                  value={transition.requiredPermission ?? ''}
                  onChange={(event) =>
                    updateTransition(index, {
                      requiredPermission: event.target.value || null,
                    })
                  }
                >
                  <NativeSelectOption value="">No permission</NativeSelectOption>
                  {permissionOptions.map((permission) => (
                    <NativeSelectOption key={permission} value={permission}>
                      {permission}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <fieldset>
              <legend className="text-muted-foreground text-xs font-medium uppercase">
                Required fields
              </legend>
              {availableFieldKeys.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No fields available.
                </p>
              ) : (
                <div className="mt-1 flex flex-wrap gap-3">
                  {availableFieldKeys.map((fieldKey) => {
                    const id = domId(
                      'transition',
                      String(index),
                      'field',
                      fieldKey
                    )
                    return (
                      <span key={fieldKey} className="flex items-center gap-2">
                        <Checkbox
                          id={id}
                          checked={transition.requiredFieldKeys.includes(
                            fieldKey
                          )}
                          onCheckedChange={() =>
                            toggleRequiredField(index, fieldKey)
                          }
                        />
                        <Label htmlFor={id} className="mb-0">
                          {fieldKey}
                        </Label>
                      </span>
                    )
                  })}
                </div>
              )}
            </fieldset>

            <div className="flex items-center gap-2">
              <Checkbox
                id={domId('transition', String(index), 'comment')}
                checked={transition.requiresComment}
                onCheckedChange={(checked) =>
                  updateTransition(index, { requiresComment: checked })
                }
              />
              <Label
                htmlFor={domId('transition', String(index), 'comment')}
                className="mb-0"
              >
                Requires comment
              </Label>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
