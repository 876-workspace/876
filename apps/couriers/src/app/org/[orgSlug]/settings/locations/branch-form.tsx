'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { listDialCodes, parsePhone } from '@876/core/phone'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { PhoneInput, type PhoneInputValue } from '@876/ui/phone-input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@876/ui/tabs'

import {
  AddressFields,
  emptyAddressValue,
  toAddressFieldsValue,
  toAddressParams,
  type AddressFieldsValue,
} from '@/components/address-fields'
import { client } from '@/lib/client'
import type { BranchView } from '@/types/branch'

/** Built once at module scope — the catalog is static and ~250 entries long. */
const DIAL_CODE_OPTIONS = listDialCodes().map((country) => ({
  value: country.dialCode,
  label: country.countryCode,
  leadingLabel: country.dialCode,
}))

const DEFAULT_DIAL_CODE = '+1'

/**
 * Splits a stored number into the picker's parts. An unparseable legacy value
 * keeps its digits in the number field rather than being silently dropped.
 */
function toPhoneValue(stored: string | null | undefined): PhoneInputValue {
  if (!stored) return { dialCode: DEFAULT_DIAL_CODE, number: '' }

  const parsed = parsePhone(stored, 'JM')
  if (!parsed) return { dialCode: DEFAULT_DIAL_CODE, number: stored }

  // A NANP number reports its area code separately from the national number;
  // keeping only the latter would silently drop the "876" from +1876…
  return {
    dialCode: parsed.dialCode,
    number: `${parsed.areaCode ?? ''}${parsed.nationalNumber}`,
  }
}

type Props = {
  orgSlug: string
  branch?: BranchView
  /** Whether this would be the tenant's first branch, which is always default. */
  isFirstBranch?: boolean
}

export function BranchForm({ orgSlug, branch, isFirstBranch }: Props) {
  const router = useRouter()
  const [name, setName] = useState(branch?.name ?? '')
  const [phoneValue, setPhoneValue] = useState<PhoneInputValue>(() =>
    toPhoneValue(branch?.phone)
  )
  const [isDefault, setIsDefault] = useState(branch?.isDefault ?? false)
  const [isActive, setIsActive] = useState(branch?.isActive ?? true)
  const [address, setAddress] = useState<AddressFieldsValue>(
    branch ? toAddressFieldsValue(branch.address) : emptyAddressValue('JM')
  )
  const [geographyUnavailable, setGeographyUnavailable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const listHref = `/org/${orgSlug}/settings/locations`
  // Clearing the flag on the current default is refused server-side; promote
  // another branch instead. The control says so rather than failing on submit.
  const lockedDefault = branch?.isDefault === true || isFirstBranch === true

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const addressParams = toAddressParams(address, name.trim())
      const phone = phoneValue.number.trim()
        ? `${phoneValue.dialCode}${phoneValue.number.replace(/\D/g, '')}`
        : ''
      const result = branch
        ? await client.branches.update(orgSlug, branch.id, {
            name: name.trim(),
            phone: phone || null,
            ...(lockedDefault ? {} : { isDefault }),
            isActive,
            address: addressParams,
          })
        : await client.branches.create(orgSlug, {
            name: name.trim(),
            ...(phone ? { phone } : {}),
            ...(lockedDefault ? {} : { isDefault }),
            isActive,
            address: addressParams,
          })

      if (result.error) {
        setError(result.error.message)
        return
      }

      router.push(listHref)
      router.refresh()
    })
  }

  return (
    <form className="max-w-3xl space-y-6" onSubmit={save}>
      <div className="876-card space-y-5 p-5">
        <FormRow htmlFor="branch-name" label="Branch name" required>
          <Input
            id="branch-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isPending}
            required
          />
        </FormRow>

        <FormRow
          htmlFor="branch-phone"
          label="Phone"
          hint="The number customers reach this branch on."
        >
          <PhoneInput
            id="branch-phone"
            value={phoneValue}
            onValueChange={setPhoneValue}
            dialCodes={DIAL_CODE_OPTIONS}
            disabled={isPending}
          />
        </FormRow>

        <FormRow label="Default">
          {isFirstBranch ? (
            <p className="text-muted-foreground pt-2 text-sm">
              Your first branch is the default customers and packages route to.
            </p>
          ) : branch?.isDefault ? (
            <p className="text-muted-foreground pt-2 text-sm">
              This is the default branch. Promote another branch to change it.
            </p>
          ) : (
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="branch-default"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
                disabled={isPending}
              />
              <Label htmlFor="branch-default" className="mb-0">
                Set as default branch
              </Label>
            </div>
          )}
        </FormRow>

        <FormRow label="Status">
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="branch-active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
              disabled={isPending}
            />
            <Label htmlFor="branch-active" className="mb-0">
              Active
            </Label>
          </div>
        </FormRow>
      </div>

      <Tabs defaultValue="address" className="gap-5">
        <TabsList variant="line" className="mb-1">
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="custom-fields">Custom fields</TabsTrigger>
        </TabsList>

        <TabsContent value="address" className="876-card p-5">
          <AddressFields
            value={address}
            onChange={setAddress}
            disabled={isPending}
            onGeographyUnavailable={setGeographyUnavailable}
          />
        </TabsContent>

        {/* TODO: custom fields are not built yet — the tab is deliberately
            empty so the information architecture matches the warehouse form. */}
        <TabsContent value="custom-fields" className="876-card p-5">
          <p className="text-muted-foreground text-sm">No custom fields yet.</p>
        </TabsContent>
      </Tabs>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="info"
          disabled={isPending || geographyUnavailable}
        >
          {branch ? 'Save' : 'Add'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(listHref)}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
