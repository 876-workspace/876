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

  function submit() {
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
        `/settings/orgs/provisioning/${encodeURIComponent(data.key)}/workspace`
      )
    })
  }

  return (
    <div className="876-card max-w-2xl space-y-4 p-5">
      <div>
        <h2 className="text-foreground text-sm font-semibold">Setup identity</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Create the setup first, then build its currencies, payment defaults,
          tax authorities, and other provisioning records from its tabs.
        </p>
      </div>

      <FormRow label="Name" htmlFor="setup-name" required>
        <Input
          id="setup-name"
          value={name}
          onChange={(event) => handleName(event.target.value)}
          placeholder="New Zealand"
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
          rows={2}
          placeholder="Optional description for operators."
        />
      </FormRow>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push('/settings/orgs/provisioning')}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button variant="info" onClick={submit} disabled={isPending}>
          {isPending ? 'Creating…' : 'Create setup'}
        </Button>
      </div>
    </div>
  )
}
