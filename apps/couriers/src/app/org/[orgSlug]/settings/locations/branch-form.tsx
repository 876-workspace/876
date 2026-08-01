'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'

import {
  AddressFields,
  emptyAddressValue,
  toAddressFieldsValue,
  toAddressParams,
  type AddressFieldsValue,
} from '@/components/address-fields'
import { client } from '@/lib/client'
import type { BranchView } from '@/types/branch'

type Props = {
  orgSlug: string
  branch?: BranchView
  /** Whether this would be the tenant's first branch, which is always default. */
  isFirstBranch?: boolean
}

export function BranchForm({ orgSlug, branch, isFirstBranch }: Props) {
  const router = useRouter()
  const [name, setName] = useState(branch?.name ?? '')
  const [phone, setPhone] = useState(branch?.phone ?? '')
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
      const result = branch
        ? await client.branches.update(orgSlug, branch.id, {
            name: name.trim(),
            phone: phone.trim() || null,
            ...(lockedDefault ? {} : { isDefault }),
            isActive,
            address: addressParams,
          })
        : await client.branches.create(orgSlug, {
            name: name.trim(),
            ...(phone.trim() ? { phone: phone.trim() } : {}),
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
      <div className="876-card grid gap-5 p-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="branch-name">Branch name</Label>
          <Input
            id="branch-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isPending}
            required
          />
        </div>

        <div>
          <Label htmlFor="branch-phone">Phone</Label>
          <Input
            id="branch-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="876-card p-5">
        <AddressFields
          value={address}
          onChange={setAddress}
          disabled={isPending}
          onGeographyUnavailable={setGeographyUnavailable}
        />
      </div>

      <div className="876-card space-y-4 p-5">
        {isFirstBranch ? (
          <p className="text-muted-foreground text-sm">
            Your first branch is the default customers and packages route to.
          </p>
        ) : branch?.isDefault ? (
          <p className="text-muted-foreground text-sm">
            This is the default branch. Promote another branch to change it.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <Checkbox
              id="branch-default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
              disabled={isPending}
            />
            <Label htmlFor="branch-default">Set as default branch</Label>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            id="branch-active"
            checked={isActive}
            onCheckedChange={(checked) => setIsActive(checked === true)}
            disabled={isPending}
          />
          <Label htmlFor="branch-active">Active</Label>
        </div>
      </div>

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
