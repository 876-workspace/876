'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminProvisioningSetup } from '@876/admin'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'

export function EditSetupForm({ setup }: { setup: AdminProvisioningSetup }) {
  const router = useRouter()
  const [name, setName] = useState(setup.name)
  const [description, setDescription] = useState(setup.description ?? '')
  const [countryCode, setCountryCode] = useState(setup.country_code ?? '')
  const [currencyCode, setCurrencyCode] = useState(setup.currency_code ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const detail = `/settings/orgs/provisioning/${encodeURIComponent(setup.key)}`

  function submit() {
    setError(null)
    if (!name.trim()) {
      setError('A name is required.')
      return
    }
    startTransition(async () => {
      const { data, error: failure } = await client.provisioningSetups.update(
        setup.key,
        {
          name,
          description: description.trim() || null,
          country_code: countryCode.trim() ? countryCode.trim() : null,
          currency_code: currencyCode.trim() ? currencyCode.trim() : null,
        }
      )
      if (failure || !data) {
        setError(failure?.message ?? 'Failed to update the setup.')
        return
      }
      router.push(detail)
      router.refresh()
    })
  }

  return (
    <div className="876-card max-w-2xl space-y-4 p-5">
      <FormRow label="Key">
        <Input value={setup.key} readOnly disabled />
      </FormRow>

      <FormRow label="Name" htmlFor="setup-name" required>
        <Input
          id="setup-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
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
        />
      </FormRow>

      <FormRow label="Currency" htmlFor="setup-currency">
        <Input
          id="setup-currency"
          value={currencyCode}
          onChange={(event) =>
            setCurrencyCode(event.target.value.toUpperCase().slice(0, 3))
          }
        />
      </FormRow>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(detail)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button variant="info" onClick={submit} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
