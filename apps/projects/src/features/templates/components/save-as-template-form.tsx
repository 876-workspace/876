'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { templatesClient } from '@/lib/client/templates'

function keyFromName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function SaveAsTemplateForm({
  project,
}: {
  project: { id: string; name: string }
}) {
  const router = useRouter()
  const [key, setKey] = useState('')
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const resolvedKey = keyFromName(key)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!resolvedKey || !name.trim() || pending) return

    setPending(true)
    setError(null)
    const result = await templatesClient.saveAsTemplate(project.id, {
      key: resolvedKey,
      name: name.trim(),
      description: description.trim() || null,
    })
    setPending(false)

    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/template-save-failed',
          message: 'The template could not be saved.',
        }
      )
      return
    }

    router.push(`/settings/templates/${encodeURIComponent(result.data.id)}`)
    router.refresh()
  }

  return (
    <form
      onSubmit={onSubmit}
      className="876-card max-w-3xl space-y-5 p-6"
      aria-label="Save as template"
    >
      {error ? (
        <AppError title="The template could not be saved" error={error} />
      ) : null}

      <div className="876-card space-y-2 p-4 text-sm">
        <p className="font-medium">Template contents</p>
        <p className="text-muted-foreground">
          Phases, task lists, work items, dependencies, and budget defaults are
          captured with dates as offsets in days. Members, time entries, and
          comments are never captured.
        </p>
      </div>

      <FormRow
        label="Key"
        htmlFor="template-key"
        required
        hint="Lowercase letters, numbers, and dashes — unique across templates."
      >
        <Input
          id="template-key"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder={keyFromName(name)}
          autoFocus
        />
      </FormRow>

      <FormRow label="Name" htmlFor="template-name" required>
        <Input
          id="template-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </FormRow>

      <FormRow label="Description" htmlFor="template-description">
        <Textarea
          id="template-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
        />
      </FormRow>

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
          disabled={!resolvedKey || !name.trim() || pending}
        >
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
