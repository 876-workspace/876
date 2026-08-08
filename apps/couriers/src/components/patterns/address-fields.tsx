'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { SearchableSelect } from '@876/ui/searchable-select'

import { client } from '@/lib/client'
import type { AddressCreateParams, AddressView } from '@/types/address'

export type AddressFieldsValue = {
  line1: string
  line2: string
  city: string
  countryCode: string
  regionCode: string
  postalCode: string
}

type Country = { code: string; name: string }
type Region = { code: string; name: string; type: string }

export function emptyAddressValue(countryCode = 'JM'): AddressFieldsValue {
  return {
    line1: '',
    line2: '',
    city: '',
    countryCode,
    regionCode: '',
    postalCode: '',
  }
}

export function toAddressFieldsValue(address: AddressView): AddressFieldsValue {
  return {
    line1: address.line1,
    line2: address.line2 ?? '',
    city: address.city,
    countryCode: address.countryCode,
    regionCode: address.regionCode ?? '',
    postalCode: address.postalCode ?? '',
  }
}

/** Drops blank optional fields so the server sees absence, not empty strings. */
export function toAddressParams(
  value: AddressFieldsValue,
  name: string
): AddressCreateParams {
  return {
    name,
    line1: value.line1.trim(),
    ...(value.line2.trim() ? { line2: value.line2.trim() } : {}),
    city: value.city.trim(),
    countryCode: value.countryCode,
    ...(value.regionCode ? { regionCode: value.regionCode } : {}),
    ...(value.postalCode.trim() ? { postalCode: value.postalCode.trim() } : {}),
  }
}

/**
 * Title-cases the catalog's region type so the label reads as the country's own
 * vocabulary — Parish in Jamaica, State in the US, Province in Canada — rather
 * than a generic "Region" everywhere.
 */
function regionLabel(regions: Region[]): string {
  const type = regions[0]?.type
  if (!type) return 'Region'

  return type.charAt(0).toUpperCase() + type.slice(1)
}

/**
 * Country subdivisions are static reference data, so a country visited once in
 * this page session never needs a second round trip. Without this, every switch
 * back to a country the user already picked re-fetches, and the field spends
 * another network round trip disabled — which is what makes the Parish/State
 * switch feel slow even though the request itself is fast.
 *
 * Module scope is safe here: the catalog is public, identical for every user,
 * and this file is a client component, so there is no cross-request server
 * state to leak.
 */
const regionCache = new Map<string, Region[]>()

/**
 * Test support. The cache is module state, so it survives between test cases in
 * a file and would otherwise let one case satisfy the next case's fetch.
 */
export function clearRegionCache(): void {
  regionCache.clear()
}

type Props = {
  value: AddressFieldsValue
  onChange: (value: AddressFieldsValue) => void
  disabled?: boolean
  /** Surfaces that geography could not be loaded, so the parent can block submit. */
  onGeographyUnavailable?: (unavailable: boolean) => void
}

export function AddressFields({
  value,
  onChange,
  disabled,
  onGeographyUnavailable,
}: Props) {
  const [countries, setCountries] = useState<Country[] | null>(null)
  // Keyed by the country it was loaded for, so "still loading" is derived from
  // a mismatch rather than tracked as a second piece of state that has to be
  // flipped in the effect body.
  // Only ever holds a freshly fetched result. A cached country is resolved
  // during render instead, so a cache hit costs no state write and no extra
  // render — see `regions` below.
  const [fetchedRegions, setFetchedRegions] = useState<{
    countryCode: string
    regions: Region[]
  } | null>(null)
  const [countryError, setCountryError] = useState(false)

  useEffect(() => {
    let cancelled = false

    void client.geo.listCountries().then((result) => {
      if (cancelled) return

      if (result.error) {
        setCountryError(true)
        onGeographyUnavailable?.(true)
        return
      }

      setCountries(result.data)
    })

    return () => {
      cancelled = true
    }
    // Runs once: the catalog does not depend on the selected country.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const countryCode = value.countryCode
    if (!countryCode) return

    // Already cached: render resolves it directly, so there is nothing to do
    // and no state to write.
    if (regionCache.has(countryCode)) return

    let cancelled = false

    void client.geo.listRegions(countryCode).then((result) => {
      const regions = result.error ? [] : result.data
      // Cached even when the component unmounted mid-flight: the next form to
      // open pays nothing for a request this one already made. A failed lookup
      // is not cached, so it can be retried.
      if (!result.error) regionCache.set(countryCode, regions)

      if (cancelled) return

      setFetchedRegions({ countryCode, regions })
    })

    return () => {
      cancelled = true
    }
  }, [value.countryCode])

  function selectCountry(countryCode: string | null) {
    if (!countryCode) return

    // The previously selected region belongs to the previous country, so it is
    // cleared rather than submitted against a country it does not belong to.
    onChange({ ...value, countryCode, regionCode: '' })
  }

  // Cache first, so a country visited before resolves in the same render that
  // selected it. A stale fetched entry means the country just changed and its
  // regions are still in flight, so the control stays disabled rather than
  // briefly offering the previous country's options.
  const regions =
    regionCache.get(value.countryCode) ??
    (fetchedRegions?.countryCode === value.countryCode
      ? fetchedRegions.regions
      : null)
  const regionsLoading = regions === null

  const label = regions ? regionLabel(regions) : 'Region'
  // While regions are in flight the field stays mounted and disabled. Hiding it
  // and bringing it back shifts every control below it, which reads as a slower
  // form than one that simply waits in place.
  const hasRegions = regionsLoading || (regions?.length ?? 0) > 0

  const countryOptions = useMemo(
    () => (countries ?? []).map((c) => ({ value: c.code, label: c.name })),
    [countries]
  )
  const regionOptions = useMemo(
    () => (regions ?? []).map((r) => ({ value: r.code, label: r.name })),
    [regions]
  )

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="address-line1">Address line 1</Label>
        <Input
          id="address-line1"
          value={value.line1}
          onChange={(event) =>
            onChange({ ...value, line1: event.target.value })
          }
          disabled={disabled}
          required
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="address-line2">Address line 2</Label>
        <Input
          id="address-line2"
          value={value.line2}
          onChange={(event) =>
            onChange({ ...value, line2: event.target.value })
          }
          disabled={disabled}
        />
      </div>

      <div>
        <Label htmlFor="address-city">City</Label>
        <Input
          id="address-city"
          value={value.city}
          onChange={(event) => onChange({ ...value, city: event.target.value })}
          disabled={disabled}
          required
        />
      </div>

      <div>
        <Label htmlFor="address-country">Country</Label>
        {countryError ? (
          <p className="text-destructive mt-2 text-[0.8125rem]">
            Country information could not be loaded.
          </p>
        ) : (
          <SearchableSelect
            id="address-country"
            options={countryOptions}
            value={value.countryCode}
            onValueChange={selectCountry}
            placeholder="Select a country"
            searchPlaceholder="Search countries…"
            emptyMessage="No country matches that search."
            disabled={disabled || !countries}
          />
        )}
      </div>

      {hasRegions ? (
        <div>
          <Label htmlFor="address-region">{label}</Label>
          <SearchableSelect
            id="address-region"
            options={regionOptions}
            value={value.regionCode}
            onValueChange={(regionCode) => onChange({ ...value, regionCode })}
            placeholder={
              regionsLoading ? 'Loading…' : `Select a ${label.toLowerCase()}`
            }
            searchPlaceholder={`Search ${label.toLowerCase()}…`}
            emptyMessage={`No ${label.toLowerCase()} matches that search.`}
            disabled={disabled || regionsLoading}
          />
        </div>
      ) : null}

      <div>
        <Label htmlFor="address-postal">Postal code</Label>
        <Input
          id="address-postal"
          value={value.postalCode}
          onChange={(event) =>
            onChange({ ...value, postalCode: event.target.value })
          }
          disabled={disabled}
        />
      </div>
    </div>
  )
}
