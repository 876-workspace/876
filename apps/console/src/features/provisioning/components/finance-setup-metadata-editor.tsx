'use client'

import countries from '@876/core/countries.json'
import {
  PROVISIONING_SETUP_ENTITLEMENT_CATALOG,
  type ProvisioningSetupPolicy,
} from '@876/core/types/provisioning-policy'
import type { AdminProvisioningSetup } from '@876/platform/compat'
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
import { useEffect, useMemo, useState, useTransition } from 'react'

import { client } from '@/lib/client'

const entitlementKey = (targetType: string, targetKey: string) =>
  `${targetType}:${targetKey}`

const ENTITLEMENT_DESCRIPTIONS: Record<string, string> = {
  'application:876-enterprise':
    'Base organization directory and administration access. Every organization keeps this entitlement.',
  'application:876-couriers':
    'Standalone 876 Couriers product access. This is separate from shared platform services.',
  'application:876-billing':
    'Standalone 876 Billing application access. Embedded finance/customer infrastructure remains available without this entitlement.',
  'application:876-invoice':
    'Standalone 876 Invoice application access. This does not control whether the organization has a finance workspace.',
  'application:876-crm':
    'Standalone 876 CRM product access. Source-app signup may still explicitly request CRM in Phase 2.',
  'service:work':
    'Shared Work service used for tasks, reminders, calendar/workspace records and other Work-backed modules.',
}

export function FinanceSetupMetadataEditor({
  setup,
}: {
  setup: AdminProvisioningSetup
}) {
  const router = useRouter()
  const [name, setName] = useState(setup.name)
  const [description, setDescription] = useState(setup.description ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [messageIsError, setMessageIsError] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [policy, setPolicy] = useState<ProvisioningSetupPolicy | null>(null)
  const [policyLoading, setPolicyLoading] = useState(true)
  const [policySaving, setPolicySaving] = useState(false)
  const [policyError, setPolicyError] = useState<string | null>(null)
  const [countryCodes, setCountryCodes] = useState<string[]>([])
  const [countryToAdd, setCountryToAdd] = useState('')
  const [entitlements, setEntitlements] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false

    async function loadPolicy() {
      setPolicyLoading(true)
      setPolicyError(null)
      const { data, error } = await client.provisioningSetups.retrievePolicy(
        setup.key
      )
      if (cancelled) return

      if (error || !data) {
        setPolicyError(error?.message ?? 'Failed to load the setup policy.')
        setPolicyLoading(false)
        return
      }

      setPolicy(data)
      const groups = new Map<string, typeof data.conditions>()
      for (const condition of data.conditions) {
        const group = groups.get(condition.group_key) ?? []
        group.push(condition)
        groups.set(condition.group_key, group)
      }
      setCountryCodes(
        [...groups.values()]
          .filter(
            (group) => group.length === 1 && group[0]?.field === 'country'
          )
          .map((group) => group[0]!.value)
      )
      setEntitlements(
        Object.fromEntries(
          data.entitlements.map((entitlement) => [
            entitlementKey(entitlement.target_type, entitlement.target_key),
            entitlement.enabled,
          ])
        )
      )
      setPolicyLoading(false)
    }

    void loadPolicy()
    return () => {
      cancelled = true
    }
  }, [setup.key])

  const availableCountries = useMemo(
    () => countries.filter((country) => !countryCodes.includes(country.countryCode)),
    [countryCodes]
  )

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

  function saveDetails() {
    if (!name.trim()) {
      setMessageIsError(true)
      setMessage('A name is required.')
      return
    }

    runUpdate(
      {
        name: name.trim(),
        description: description.trim() || null,
      },
      'Setup details saved.'
    )
  }

  async function savePolicy() {
    if (!policy || policySaving) return

    setPolicySaving(true)
    setPolicyError(null)

    const groups = new Map<string, typeof policy.conditions>()
    for (const condition of policy.conditions) {
      const group = groups.get(condition.group_key) ?? []
      group.push(condition)
      groups.set(condition.group_key, group)
    }
    const simpleCountryGroups = new Set(
      [...groups.entries()]
        .filter(
          ([, group]) => group.length === 1 && group[0]?.field === 'country'
        )
        .map(([groupKey]) => groupKey)
    )

    // Preserve advanced country+subdivision/jurisdiction groups. This Phase-1
    // Console only edits simple country alternatives; future matching fields can
    // be added without this screen deleting them.
    const preservedConditions = policy.conditions
      .filter((condition) => !simpleCountryGroups.has(condition.group_key))
      .map((condition) => ({
        group_key: condition.group_key,
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
        priority: condition.priority,
      }))

    const catalogKeys = new Set(
      PROVISIONING_SETUP_ENTITLEMENT_CATALOG.map((entry) =>
        entitlementKey(entry.target_type, entry.target_key)
      )
    )
    const preservedEntitlements = policy.entitlements
      .filter(
        (entitlement) =>
          !catalogKeys.has(
            entitlementKey(entitlement.target_type, entitlement.target_key)
          )
      )
      .map((entitlement) => ({
        target_type: entitlement.target_type,
        target_key: entitlement.target_key,
        enabled: entitlement.enabled,
      }))

    const { data, error } = await client.provisioningSetups.replacePolicy(
      setup.key,
      {
        conditions: [
          ...preservedConditions,
          ...countryCodes.map((countryCode) => ({
            group_key: countryCode.toLowerCase(),
            field: 'country' as const,
            operator: 'equals' as const,
            value: countryCode,
            priority: 100,
          })),
        ],
        entitlements: [
          ...PROVISIONING_SETUP_ENTITLEMENT_CATALOG.map((entry) => ({
            target_type: entry.target_type,
            target_key: entry.target_key,
            enabled:
              entitlements[entitlementKey(entry.target_type, entry.target_key)] ??
              entry.default_enabled,
          })),
          ...preservedEntitlements,
        ],
      }
    )

    setPolicySaving(false)
    if (error || !data) {
      setPolicyError(error?.message ?? 'Failed to save the setup policy.')
      return
    }

    setPolicy(data)
    setPolicyError('Policy saved.')
    router.refresh()
  }

  function addCountry() {
    if (!countryToAdd || countryCodes.includes(countryToAdd)) return
    setCountryCodes((current) => [...current, countryToAdd])
    setCountryToAdd('')
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
          <Button variant="info" onClick={saveDetails} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save details'}
          </Button>
        </div>
      </div>

      <div className="space-y-4 border-t pt-5">
        <div>
          <h3 className="text-foreground text-sm font-semibold">
            Matching & access policy
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Country is a matching condition, not the identity of the setup. The
            same country can appear on multiple setups and one setup can match
            multiple countries. Currency and language remain finance Workspace
            manifest fields.
          </p>
        </div>

        {policyLoading ? (
          <p className="text-muted-foreground text-sm">Loading policy…</p>
        ) : policy ? (
          <>
            <div className="space-y-3">
              <div>
                <p className="text-foreground text-sm font-medium">Countries</p>
                <p className="text-muted-foreground text-xs">
                  Leave empty for a location-neutral fallback. Country values
                  come from the shared 876 country catalog and cannot be typed
                  arbitrarily.
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
                  disabled={!countryToAdd}
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
                  No country condition. This setup can act as a fallback when
                  selection rules do not find a more specific match.
                </p>
              )}
            </div>

            <div className="space-y-3 border-t pt-4">
              <div>
                <p className="text-foreground text-sm font-medium">
                  Entitlements
                </p>
                <p className="text-muted-foreground text-xs">
                  Product access is explicit. Embedded finance/customer data is
                  platform infrastructure and is not the same as Billing or
                  Invoice application access.
                </p>
              </div>

              <div className="divide-y rounded-md border">
                {PROVISIONING_SETUP_ENTITLEMENT_CATALOG.map((entry) => {
                  const key = entitlementKey(entry.target_type, entry.target_key)
                  const enabled = entitlements[key] ?? entry.default_enabled
                  const locked = entry.target_key === '876-enterprise'
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-4 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{entry.label}</p>
                        <p className="text-muted-foreground text-xs">
                          {ENTITLEMENT_DESCRIPTIONS[key]}
                        </p>
                      </div>
                      <Switch
                        checked={locked ? true : enabled}
                        onCheckedChange={(checked) =>
                          setEntitlements((current) => ({
                            ...current,
                            [key]: checked,
                          }))
                        }
                        disabled={locked || policySaving}
                        aria-label={`Toggle ${entry.label}`}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex min-h-8 items-center justify-between gap-4 pt-2">
              <div aria-live="polite">
                {policyError ? (
                  <p
                    className={
                      policyError === 'Policy saved.'
                        ? 'text-muted-foreground text-xs'
                        : 'text-destructive text-xs'
                    }
                  >
                    {policyError}
                  </p>
                ) : null}
              </div>
              <Button
                variant="info"
                onClick={savePolicy}
                disabled={policySaving}
              >
                {policySaving ? 'Saving…' : 'Save policy'}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-destructive text-sm">
            {policyError ?? 'The setup policy could not be loaded.'}
          </p>
        )}
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
