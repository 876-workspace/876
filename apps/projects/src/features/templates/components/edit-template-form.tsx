'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { templatesClient } from '@/lib/client/templates'

export type EditTemplateTarget = {
  id: string
  name: string
  description: string | null
}

export function EditTemplateForm({ template }: { template: EditTemplateTarget }) {
  const router = useRouter()
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || pending) return

    setPending(true)
    setError(null)
    const result = await templatesClient.update(template.id, {
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
      aria-label="Edit template"
    >
      {error ? (
        <AppError title="The template could not be saved" error={error} />
      ) : null}

      <FormRow label="Name" htmlFor="template-name" required>
        <Input
          id="template-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
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
        <Button type="submit" variant="info" disabled={!name.trim() || pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
