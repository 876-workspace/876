'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@876/ui/select'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'

export type SetupSource = { key: string; name: string; isDefault: boolean }

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function CreateSetupForm({ sources }: { sources: SetupSource[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [keyEdited, setKeyEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [copyFrom, setCopyFrom] = useState(
    sources.find((source) => source.isDefault)?.key ?? sources[0]?.key ?? ''
  )
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
        name,
        description: description.trim() || null,
        country_code: countryCode.trim() ? countryCode.trim() : null,
        currency_code: currencyCode.trim() ? currencyCode.trim() : null,
        copy_from: copyFrom || null,
      })
      if (failure || !data) {
        setError(failure?.message ?? 'Failed to create the setup.')
        return
      }
      router.push(`/settings/orgs/provisioning/${encodeURIComponent(data.key)}`)
    })
  }

  return (
    <div className="876-card max-w-2xl space-y-4 p-5">
      <FormRow label="Name" htmlFor="setup-name" required>
        <Input
          id="setup-name"
          value={name}
          onChange={(event) => handleName(event.target.value)}
          placeholder="United States"
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
          placeholder="united-states"
        />
      </FormRow>

      <FormRow label="Description" htmlFor="setup-description">
        <Textarea
          id="setup-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
        />
      </FormRow>

      <FormRow label="Country" htmlFor="setup-country">
        <Input
          id="setup-country"
          value={countryCode}
          onChange={(event) =>
            setCountryCode(event.target.value.toUpperCase().slice(0, 2))
          }
          placeholder="US"
        />
      </FormRow>

      <FormRow label="Currency" htmlFor="setup-currency">
        <Input
          id="setup-currency"
          value={currencyCode}
          onChange={(event) =>
            setCurrencyCode(event.target.value.toUpperCase().slice(0, 3))
          }
          placeholder="USD"
        />
      </FormRow>

      <FormRow
        label="Copy defaults from"
        hint="The new setup starts as a copy of this one's published defaults, which you then edit."
      >
        <Select
          value={copyFrom}
          onValueChange={(value) => setCopyFrom(value ?? '')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a setup" />
          </SelectTrigger>
          <SelectContent>
            {sources.map((source) => (
              <SelectItem key={source.key} value={source.key}>
                {source.name}
                {source.isDefault ? ' (default)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          {isPending ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </div>
  )
}
