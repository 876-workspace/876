'use client'

import type { Layout, LayoutEntity } from '@876/projects/contracts'
import { LayoutEditor } from '@876/projects-ui/layouts/layout-editor'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { layoutsClient } from '@/lib/client'
import type { LayoutDefinitionInput } from '@/types/layouts'

export function CustomModuleLayoutSection({
  moduleKey,
  pluralName,
  layout,
  availableFields,
}: {
  moduleKey: string
  pluralName: string
  layout: Layout | null
  availableFields: { fieldKey: string; label: string }[]
}) {
  const router = useRouter()
  const [name, setName] = useState(layout?.name ?? `${pluralName} layout`)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [saved, setSaved] = useState(false)

  const entity = `custom-module:${moduleKey}` as LayoutEntity
  const initial: Layout =
    layout ??
    ({
      object: 'projects.layout',
      id: null,
      entity,
      workItemTypeId: null,
      name: `${pluralName} layout`,
      version: 1,
      isDefault: false,
      builtIn: false,
      sections: [
        {
          key: 'section-1',
          title: 'Details',
          columns: 1,
          fields: availableFields.map((field) => ({
            fieldKey: field.fieldKey,
            width: 1 as const,
            visible: true,
          })),
        },
      ],
      rules: [],
    } satisfies Layout)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !name.trim()) return
    const raw = String(
      new FormData(event.currentTarget).get('definition') ?? ''
    )
    let definition: LayoutDefinitionInput
    try {
      definition = JSON.parse(raw) as LayoutDefinitionInput
    } catch {
      setError({
        code: 'projects/layout-invalid',
        message: 'The layout definition could not be read.',
      })
      return
    }

    setPending(true)
    setError(null)
    setSaved(false)
    const result =
      layout?.id != null
        ? await layoutsClient.update(layout.id, {
            name: name.trim(),
            definition,
          })
        : await layoutsClient.create({
            entity,
            name: name.trim(),
            definition,
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
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="max-w-4xl space-y-5">
      {error ? (
        <AppError title="Layout not saved" error={error} variant="banner" />
      ) : null}
      {saved ? <p className="text-sm text-emerald-600">Layout saved.</p> : null}
      <div className="max-w-2xl">
        <FormRow label="Name" htmlFor="module-layout-name" required>
          <Input
            id="module-layout-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormRow>
      </div>
      <LayoutEditor initial={initial} availableFields={availableFields} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save layout'}
      </Button>
    </form>
  )
}
