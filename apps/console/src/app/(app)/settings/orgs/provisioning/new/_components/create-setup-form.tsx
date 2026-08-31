'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function CreateSetupForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [keyEdited, setKeyEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleName(value: string) {
    setName(value)
    if (!keyEdited) setKey(slugify(value))
  }

  function submit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError(null)
    if (!name.trim() || !key.trim()) {
      setError('A name and key are required.')
      return
    }

    startTransition(async () => {
      const { data, error: failure } = await client.provisioningSetups.create({
        key,
        name: name.trim(),
        description: description.trim() || null,
      })
      if (failure || !data) {
        setError(failure?.message ?? 'Failed to create the setup.')
        return
      }

      router.push(
        `/settings/orgs/provisioning/${encodeURIComponent(data.key)}`
      )
    })
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <FormRow label="Name" htmlFor="setup-name" required>
        <Input
          id="setup-name"
          value={name}
          onChange={(event) => handleName(event.target.value)}
          placeholder="New Zealand"
          autoFocus
        />
      </FormRow>

      <FormRow
        label="Key"
        htmlFor="setup-key"
        required
        hint="Permanent identifier for this setup's finance manifest. Renaming it orphans the manifest."
      >
        <Input
          id="setup-key"
          value={key}
          onChange={(event) => {
            setKeyEdited(true)
            setKey(slugify(event.target.value))
          }}
          placeholder="new-zealand"
        />
      </FormRow>

      <FormRow label="Description" htmlFor="setup-description">
        <Textarea
          id="setup-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Optional description for operators."
        />
      </FormRow>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/settings/orgs/provisioning')}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" variant="info" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create setup'}
        </Button>
      </div>
    </form>
  )
}
