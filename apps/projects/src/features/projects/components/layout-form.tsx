'use client'

import { LayoutEditor } from '@876/projects-ui/layouts/layout-editor'
import type { Layout } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { layoutsClient } from '@/lib/client'

type EntityOption = 'project' | 'phase' | 'work-item'

type TypeOption = { id: string; key: string; name: string }

type AvailableField = { fieldKey: string; label: string }

type Props = {
  mode: 'create' | 'edit'
  layout: Layout
  workItemTypes: readonly TypeOption[]
  availableByEntity: Record<EntityOption, readonly AvailableField[]>
}

/**
 * Name/entity/type live in this form; sections and rules live in the
 * `LayoutEditor`, which posts them back as a `definition` hidden input —
 * exactly what the API stores.
 */
export function LayoutForm({ mode, layout, workItemTypes, availableByEntity }: Props) {
  const router = useRouter()
  const [name, setName] = useState(layout.name)
  const [entity, setEntity] = useState<EntityOption>(layout.entity)
  const [workItemTypeId, setWorkItemTypeId] = useState(
    layout.workItemTypeId ?? ''
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const editing = mode === 'edit'
  const showType = entity === 'work-item'

  const availableFields = [...availableByEntity[entity]]

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || pending) return

    const data = new FormData(event.currentTarget)
    const rawDefinition = String(data.get('definition') ?? '')
    let definition: { sections: unknown; rules?: unknown }
    try {
      definition = JSON.parse(rawDefinition) as typeof definition
    } catch {
      setError({
        code: 'projects/layout-invalid',
        message: 'The layout definition could not be read.',
      })
      return
    }

    setPending(true)
    setError(null)
    const result =
      editing && layout.id
        ? await layoutsClient.update(layout.id, { name: name.trim(), definition: definition as never })
        : await layoutsClient.create({
            entity,
            ...(showType && workItemTypeId ? { workItemTypeId } : {}),
            name: name.trim(),
            definition: definition as never,
          })
    setPending(false)

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/layout-save-failed',
          message: 'The layout could not be saved.',
        }
      )
      return
    }

    router.push('/settings/layouts')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="max-w-4xl space-y-5">
      {error ? (
        <AppError
          title={editing ? 'Layout not updated' : 'Layout not created'}
          error={error}
          variant="banner"
        />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow label="Name" htmlFor="layout-name" required>
          <Input
            id="layout-name"
            name="layout-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Default project layout"
            autoFocus
          />
        </FormRow>
        {!editing ? (
          <FormRow label="Applies to" htmlFor="layout-entity" required>
            <NativeSelect
              id="layout-entity"
              name="layout-entity"
              value={entity}
              onChange={(event) => {
                setEntity(event.target.value as EntityOption)
                setWorkItemTypeId('')
              }}
              className="w-full"
            >
              <NativeSelectOption value="project">Projects</NativeSelectOption>
              <NativeSelectOption value="phase">Phases</NativeSelectOption>
              <NativeSelectOption value="work-item">Work items</NativeSelectOption>
            </NativeSelect>
          </FormRow>
        ) : null}
      </div>

      {!editing && showType ? (
        <FormRow label="Work item type" htmlFor="layout-type">
          <NativeSelect
            id="layout-type"
            name="layout-type"
            value={workItemTypeId}
            onChange={(event) => setWorkItemTypeId(event.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="">
              All work item types (entity default)
            </NativeSelectOption>
            {workItemTypes.map((type) => (
              <NativeSelectOption key={type.id} value={type.id}>
                {type.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormRow>
      ) : null}

      <LayoutEditor initial={layout} availableFields={availableFields} />

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" variant="info" disabled={!name.trim() || pending}>
          {pending ? 'Saving…' : editing ? 'Save changes' : 'Create layout'}
        </Button>
      </div>
    </form>
  )
}
