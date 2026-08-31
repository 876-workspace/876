'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminProvisioningSetup } from '@876/platform/compat'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Textarea } from '@876/ui/textarea'

import { client } from '@/lib/client'

export function FinanceSetupMetadataEditor({
  setup,
}: {
  setup: AdminProvisioningSetup
}) {
  const router = useRouter()
  const [name, setName] = useState(setup.name)
  const [description, setDescription] = useState(setup.description ?? '')
  const [countryCode, setCountryCode] = useState(setup.country_code ?? '')
  const [currencyCode, setCurrencyCode] = useState(setup.currency_code ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save() {
    setMessage(null)
    if (!name.trim()) {
      setMessage('A name is required.')
      return
    }

    startTransition(async () => {
      const { data, error } = await client.provisioningSetups.update(setup.key, {
        name: name.trim(),
        description: description.trim() || null,
        country_code: countryCode.trim() || null,
        currency_code: currencyCode.trim() || null,
      })
      if (error || !data) {
        setMessage(error?.message ?? 'Failed to update the setup.')
        return
      }

      setMessage('Setup details saved.')
      router.refresh()
    })
  }

  return (
    <section className="876-card max-w-2xl space-y-4 p-6">
      <div>
        <h4 className="text-foreground text-sm font-semibold">Setup details</h4>
        <p className="text-muted-foreground mt-1 text-xs">
          Identity and locale metadata for this provisioning setup.
        </p>
      </div>

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

      <div className="flex min-h-8 items-center justify-between gap-4">
        <div aria-live="polite">
          {message ? (
            <p
              className={
                message === 'Setup details saved.'
                  ? 'text-muted-foreground text-xs'
                  : 'text-destructive text-xs'
              }
            >
              {message}
            </p>
          ) : null}
        </div>
        <Button variant="info" onClick={save} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save setup'}
        </Button>
      </div>
    </section>
  )
}
