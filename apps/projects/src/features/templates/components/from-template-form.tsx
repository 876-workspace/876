'use client'

import type { TemplateIncludeFlags } from '@876/projects/contracts'
import { InstantiateOptions } from '@876/projects-ui/templates/instantiate-options'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { NativeSelect } from '@876/ui/native-select'
import { useRouter } from 'next/navigation'
import { useState, type ChangeEvent, type FormEvent } from 'react'

import { templatesClient } from '@/lib/client/templates'
import { parseDateInput } from '@/lib/date-input'

import { templatePreviewHref } from '../template-preview-query'

export type FromTemplateOption = {
  id: string
  key: string
  name: string
}

export type FromTemplateInitial = {
  templateId: string
  start: string
  include: Required<TemplateIncludeFlags>
}

function includeFromForm(form: HTMLFormElement): Required<TemplateIncludeFlags> {
  const data = new FormData(form)
  return {
    includeWorkItems: data.get('includeWorkItems') === 'true',
    includeDependencies: data.get('includeDependencies') === 'true',
    includeBudgets: data.get('includeBudgets') === 'true',
  }
}

/** Creates one idempotency key per mount, so a retried submit replays safely. */
function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`
}

export function FromTemplateForm({
  templates,
  initial,
}: {
  templates: readonly FromTemplateOption[]
  initial: FromTemplateInitial
}) {
  const router = useRouter()
  const [templateId, setTemplateId] = useState(initial.templateId)
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [start, setStart] = useState(initial.start)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [idempotencyKey] = useState(newIdempotencyKey)

  function syncPreview(
    nextTemplateId: string,
    nextStart: string,
    include: Required<TemplateIncludeFlags>
  ) {
    if (nextTemplateId === '') return
    router.replace(
      templatePreviewHref({
        templateId: nextTemplateId,
        start: nextStart,
        include,
      }),
      { scroll: false }
    )
  }

  function onTemplateChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value
    setTemplateId(next)
    if (event.target.form)
      syncPreview(next, start, includeFromForm(event.target.form))
  }

  function onStartChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value
    setStart(next)
    if (event.target.form)
      syncPreview(templateId, next, includeFromForm(event.target.form))
  }

  function onFlagsChange(event: ChangeEvent<HTMLDivElement>) {
    const form = (event.target as Element).closest('form')
    if (form) syncPreview(templateId, start, includeFromForm(form))
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const form = event.currentTarget
    const include = includeFromForm(form)
    const startDate = parseDateInput(start)
    const trimmedKey = key.trim()

    if (templateId === '') {
      setError({
        code: 'projects/from-template-missing-template',
        message: 'Choose the template to create the project from.',
      })
      return
    }
    if (!name.trim()) {
      setError({
        code: 'projects/from-template-missing-name',
        message: 'Enter a name for the new project.',
      })
      return
    }
    if (startDate === null) {
      setError({
        code: 'projects/from-template-invalid-start',
        message: 'Enter a valid start date for the new project.',
      })
      return
    }

    setPending(true)
    setError(null)
    const result = await templatesClient.instantiate(templateId, {
      name: name.trim(),
      ...(trimmedKey === '' ? {} : { key: trimmedKey }),
      startDate,
      idempotencyKey,
      ...include,
    })
    setPending(false)

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/from-template-failed',
          message: 'The project could not be created.',
        }
      )
      return
    }

    router.push(`/projects/${encodeURIComponent(result.data.id)}`)
    router.refresh()
  }

  return (
    <form
      onSubmit={onSubmit}
      className="876-card max-w-3xl space-y-5 p-6"
      aria-label="New project from template"
    >
      {error ? (
        <AppError title="The project could not be created" error={error} />
      ) : null}

      <FormRow label="Template" htmlFor="from-template-id" required>
        <NativeSelect
          id="from-template-id"
          value={templateId}
          onChange={onTemplateChange}
          className="w-full"
        >
          <option value="">Choose a template</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {`${template.name} (${template.key})`}
            </option>
          ))}
        </NativeSelect>
      </FormRow>

      <FormRow label="Name" htmlFor="from-template-name" required>
        <Input
          id="from-template-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Console Revamp"
          autoFocus
        />
      </FormRow>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormRow
          label="Key"
          htmlFor="from-template-key"
          hint="Empty derives one from the name."
        >
          <Input
            id="from-template-key"
            value={key}
            onChange={(event) => setKey(event.target.value)}
          />
        </FormRow>
        <FormRow label="Start date" htmlFor="from-template-start" required>
          <Input
            id="from-template-start"
            type="date"
            value={start}
            onChange={onStartChange}
          />
        </FormRow>
      </div>

      <div onChange={onFlagsChange}>
        <InstantiateOptions defaultValues={initial.include} />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="info"
          disabled={templateId === '' || !name.trim() || pending}
        >
          {pending ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
