'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { SearchableSelect } from '@876/ui/searchable-select'

import { client } from '@/lib/client'
import type { GlobalCustomerOption } from '@/types/customer'

import {
  CustomerBranchField,
  type CustomerBranchOption,
} from './customer-branch-field'

const rowClassName = 'sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3'

export function CustomerEnrollmentForm({
  orgSlug,
  branches,
  customers,
  loadError,
}: {
  orgSlug: string
  branches: CustomerBranchOption[]
  customers: GlobalCustomerOption[]
  loadError: string | null
}) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState('')
  const [branchId, setBranchId] = useState(
    branches.length === 1 ? (branches[0]?.id ?? '') : ''
  )
  const [branchesReady, setBranchesReady] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const handleBranchesReady = useCallback(() => setBranchesReady(true), [])

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!customerId || !branchId) {
      setError('Select a customer and branch.')
      return
    }

    startTransition(async () => {
      const result = await client.customers.enroll(orgSlug, {
        billingCustomerId: customerId,
        branchId,
      })
      if (result.error) {
        setError(result.error.message)
        return
      }

      router.push(`/${orgSlug}/customers/${result.data.id}`)
      router.refresh()
    })
  }

  const options = customers.map((customer) => ({
    value: customer.id,
    label: [customer.name, customer.email ?? customer.phone]
      .filter(Boolean)
      .join(' — '),
  }))

  return (
    <form className="max-w-3xl space-y-6" onSubmit={submit}>
      <div className="876-card space-y-5 p-5">
        {loadError ? (
          <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
            {loadError}
          </div>
        ) : null}
        <FormRow
          htmlFor="global-customer"
          label="Customer"
          required
          className={rowClassName}
          hint="Customer details remain shared with Billing."
        >
          <SearchableSelect
            id="global-customer"
            options={options}
            value={customerId}
            onValueChange={setCustomerId}
            placeholder="Select a Billing customer"
            searchPlaceholder="Search customers…"
            emptyMessage="No unenrolled Billing customers found."
            disabled={isPending}
          />
        </FormRow>
        <CustomerBranchField
          branches={branches}
          value={branchId}
          onValueChange={setBranchId}
          onBranchesReady={handleBranchesReady}
          disabled={isPending}
          className={rowClassName}
        />
      </div>
      {error ? <div className="text-destructive text-sm">{error}</div> : null}
      <div className="flex gap-3">
        <Button
          type="submit"
          variant="info"
          disabled={
            isPending ||
            !branchesReady ||
            !customerId ||
            customers.length === 0 ||
            Boolean(loadError)
          }
        >
          Add to Couriers
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
