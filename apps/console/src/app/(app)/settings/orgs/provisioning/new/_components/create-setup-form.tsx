'use client'

import countries from '@876/core/countries.json'
import { PROVISIONING_SETUP_ENTITLEMENT_CATALOG } from '@876/core/types/provisioning-policy'
import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import {
  NativeSelect,
  NativeSelectOption,
} from '@876/ui/native-select'
import { Switch } from '@876/ui/switch'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { client } from '@/lib/client'

const entitlementKey = (targetType: string, targetKey: string) =>
  `${targetType}:${targetKey}`

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
  const [countryCodes, setCountryCodes] = useState<string[]>([])
  const [countryToAdd, setCountryToAdd] = useState('')
  const [entitlements, setEntitlements] = useState<Record<string, boolean>>(
    Object.fromEntries(
      PROVISIONING_SETUP_ENTITLEMENT_CATALOG.map((entry) => [
        entitlementKey(entry.target_type, entry.target_key),
        entry.default_enabled,
      ])
    )
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const availableCountries = useMemo(
    () =>
      countries.filter(
        (country) => !countryCodes.includes(country.countryCode)
      ),
    [countryCodes]
  )

  function handleName(value: string) {
    setName(value)
    if (!keyEdited) setKey(slugify(value))
  }

  function addCountry() {
    if (!countryToAdd || countryCodes.includes(countryToAdd)) return
    setCountryCodes((current) => [...current, countryToAdd])
    setCountryToAdd('')
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
        policy: {
          conditions: countryCodes.map((countryCode) => ({
            group_key: countryCode.toLowerCase(),
            field: 'country',
            operator: 'equals',
            value: countryCode,
            priority: 100,
          })),
          entitlements: PROVISIONING_SETUP_ENTITLEMENT_CATALOG.map((entry) => ({
            target_type: entry.target_type,
            target_key: entry.target_key,
            enabled:
              entry.target_key === '876-enterprise'
                ? true
                : (entitlements[
                    entitlementKey(entry.target_type, entry.target_key)
                  ] ?? entry.default_enabled),
          })),
        },
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
    <form onSubmit={submit} className="max-w-xl space-y-6">
      <div className="space-y-4">
        <FormRow label="Name" htmlFor="setup-name" required>
          <Input
            id="setup-name"
            value={name}
            onChange={(event) => handleName(event.target.value)}
            placeholder="United States — general"
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
            placeholder="united-states-general"
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
      </div>

      <div className="space-y-3 border-t pt-5">
        <div>
          <p className="text-sm font-medium">Matching countries</p>
          <p className="text-muted-foreground text-xs">
            Countries are matching conditions, not setup identity. Add as many
            as apply. Leave this empty for a location-neutral fallback.
          </p>
        </div>

        <div className="flex gap-2">
          <NativeSelect
            className="min-w-0 flex-1"
            value={countryToAdd}
            onChange={(event) => setCountryToAdd(event.target.value)}
            aria-label="Country to add"
          >
            <NativeSelectOption value="">Select a country</NativeSelectOption>
            {availableCountries.map((country) => (
              <NativeSelectOption
                key={country.countryCode}
                value={country.countryCode}
              >
                {country.flag} {country.name} ({country.countryCode})
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button
            type="button"
            variant="outline"
            onClick={addCountry}
            disabled={!countryToAdd || isPending}
          >
            Add
          </Button>
        </div>

        {countryCodes.length > 0 ? (
          <div className="space-y-2">
            {countryCodes.map((countryCode) => {
              const country = countries.find(
                (candidate) => candidate.countryCode === countryCode
              )

              return (
                <div
                  key={countryCode}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <span className="text-sm">
                    {country?.flag} {country?.name ?? countryCode}{' '}
                    <span className="text-muted-foreground">
                      ({countryCode})
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      setCountryCodes((current) =>
                        current.filter((value) => value !== countryCode)
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
            No country condition. This setup may be used as a fallback once
            Phase 2 routing is enabled.
          </p>
        )}
      </div>

      <div className="space-y-3 border-t pt-5">
        <div>
          <p className="text-sm font-medium">Initial entitlements</p>
          <p className="text-muted-foreground text-xs">
            Choose standalone product and shared-service access separately from
            finance workspace defaults. Enterprise is required for every
            organization.
          </p>
        </div>

        <div className="divide-y rounded-md border">
          {PROVISIONING_SETUP_ENTITLEMENT_CATALOG.map((entry) => {
            const itemKey = entitlementKey(entry.target_type, entry.target_key)
            const locked = entry.target_key === '876-enterprise'
            const enabled = locked
              ? true
              : (entitlements[itemKey] ?? entry.default_enabled)

            return (
              <div
                key={itemKey}
                className="flex items-center justify-between gap-4 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{entry.label}</p>
                  <p className="text-muted-foreground text-xs">
                    {entry.target_type === 'service'
                      ? 'Shared platform service access.'
                      : 'Standalone application entitlement.'}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  disabled={locked || isPending}
                  onCheckedChange={(checked) =>
                    setEntitlements((current) => ({
                      ...current,
                      [itemKey]: checked,
                    }))
                  }
                  aria-label={`Toggle ${entry.label}`}
                />
              </div>
            )
          })}
        </div>
      </div>

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
