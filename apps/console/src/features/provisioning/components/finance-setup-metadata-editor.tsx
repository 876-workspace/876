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
  const [messageIsError, setMessageIsError] = useState(false)
  const [isPending, startTransition] = useTransition()

  function runUpdate(
    params: Parameters<typeof client.provisioningSetups.update>[1],
    successMessage: string
  ) {
    setMessage(null)
    setMessageIsError(false)

    startTransition(async () => {
      const { data, error } = await client.provisioningSetups.update(
        setup.key,
        params
      )
      if (error || !data) {
        setMessageIsError(true)
        setMessage(error?.message ?? 'Failed to update the setup.')
        return
      }

      setMessage(successMessage)
      router.refresh()
    })
  }

  function save() {
    if (!name.trim()) {
      setMessageIsError(true)
      setMessage('A name is required.')
      return
    }

    runUpdate(
      {
        name: name.trim(),
        description: description.trim() || null,
        country_code: countryCode.trim() || null,
        currency_code: currencyCode.trim() || null,
      },
      'Setup details saved.'
    )
  }

  const canMakeDefault =
    !setup.is_default &&
    setup.status === 'active' &&
    setup.published_revision !== null
  const canArchive = !setup.is_default && setup.organization_count === 0

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-4">
        <h3 className="text-foreground text-sm font-semibold">Setup details</h3>

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormRow label="Country" htmlFor="setup-country">
            <Input
              id="setup-country"
              value={countryCode}
              onChange={(event) =>
                setCountryCode(event.target.value.toUpperCase().slice(0, 2))
              }
              placeholder="e.g. US"
            />
          </FormRow>

          <FormRow label="Currency" htmlFor="setup-currency">
            <Input
              id="setup-currency"
              value={currencyCode}
              onChange={(event) =>
                setCurrencyCode(event.target.value.toUpperCase().slice(0, 3))
              }
              placeholder="e.g. USD"
            />
          </FormRow>
        </div>

        <div className="flex min-h-8 items-center justify-between gap-4 pt-2">
          <div aria-live="polite">
            {message ? (
              <p
                className={
                  messageIsError
                    ? 'text-destructive text-xs'
                    : 'text-muted-foreground text-xs'
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
      </div>

      <div className="space-y-3 border-t pt-5">
        <h3 className="text-foreground text-sm font-semibold">Lifecycle</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canMakeDefault || isPending}
            onClick={() =>
              runUpdate({ is_default: true }, 'Setup is now the platform default.')
            }
          >
            {setup.is_default ? 'Platform default' : 'Make default'}
          </Button>
          {setup.status === 'archived' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                runUpdate({ status: 'active' }, 'Setup reactivated.')
              }
            >
              Reactivate
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!canArchive || isPending}
              onClick={() =>
                runUpdate({ status: 'archived' }, 'Setup archived.')
              }
            >
              Archive
            </Button>
          )}
        </div>
        {!setup.is_default && setup.published_revision === null ? (
          <p className="text-muted-foreground text-xs">
            Publish a complete revision to enable “Make default”.
          </p>
        ) : null}
        {!setup.is_default && setup.organization_count > 0 ? (
          <p className="text-muted-foreground text-xs">
            {setup.organization_count} organization(s) use this setup, so it
            cannot be archived.
          </p>
        ) : null}
      </div>
    </div>
  )
}
