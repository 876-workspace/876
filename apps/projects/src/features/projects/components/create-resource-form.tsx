'use client'

import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import type { ClientResult } from '@/types/client'

type CreatedResource = { id: string }

export type CreateResourceFormProps = {
  /** Label for the single required field, e.g. "Name" or "Title". */
  nameLabel: string
  namePlaceholder: string
  /** Where to go once the resource exists. */
  redirectTo: (created: CreatedResource) => string
  submit: (params: {
    name: string
    description: string | null
  }) => Promise<ClientResult<CreatedResource>>
  hint?: string
}

/**
 * One create form for the three resources whose create step is a name and an
 * optional description. A second near-identical form per resource would drift;
 * when one of them grows fields the others do not have, give it its own form
 * rather than adding a mode to this one.
 */
export function CreateResourceForm({
  nameLabel,
  namePlaceholder,
  redirectTo,
  submit,
  hint,
}: CreateResourceFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || pending) return

    setPending(true)
    setError(null)
    const result = await submit({
      name: name.trim(),
      description: description.trim() || null,
    })
    setPending(false)

    if (result.error || !result.data) {
      setError({
        code: result.error?.code ?? 'projects/create-failed',
        message: result.error?.message ?? 'Something went wrong.',
      })
      return
    }

    router.push(redirectTo(result.data))
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      {error ? (
        <AppError title="Not created" error={error} variant="banner" />
      ) : null}

      <FormRow label={nameLabel} htmlFor="name" required hint={hint}>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={namePlaceholder}
          autoFocus
        />
      </FormRow>

      <FormRow label="Description" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
        />
      </FormRow>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" variant="info" disabled={!name.trim() || pending}>
          {pending ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
