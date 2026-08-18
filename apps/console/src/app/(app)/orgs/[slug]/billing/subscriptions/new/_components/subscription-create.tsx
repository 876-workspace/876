'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminBillingAccount, AdminProduct } from '@876/admin'
import { Button } from '@876/ui/button'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { useAsyncValue } from '@/hooks/use-async-value'
import { client } from '@/lib/client'

import { buildPriceOptions } from '@/app/(app)/orgs/[slug]/billing/_components/billing-shared'

export type SubscriptionCreateSetup = {
  orgId: string
  accounts: AdminBillingAccount[]
  products: AdminProduct[]
}

type Props = {
  orgSlug: string
  setup: SubscriptionCreateSetup | Promise<SubscriptionCreateSetup>
}

export function SubscriptionCreate({ orgSlug, setup }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedPriceId, setSelectedPriceId] = useState('')
  const setupState = useAsyncValue(setup)

  const prices = useMemo(
    () =>
      buildPriceOptions(
        (setupState.value?.products ?? []).filter(
          (product) =>
            product.active && product.app_id && product.app_kind === 'product'
        )
      ),
    [setupState.value?.products]
  )
  const selectedPrice = prices.find((item) => item.price.id === selectedPriceId)
  const accounts = setupState.value?.accounts ?? []
  const optionsReady = Boolean(setupState.value)

  function createSubscription() {
    const appId = selectedPrice?.product.app_id
    if (!setupState.value || !selectedPriceId || !appId) {
      setError(
        setupState.error?.message ??
          'Select a product price before creating the subscription.'
      )
      return
    }

    setError(null)
    const { orgId } = setupState.value
    startTransition(async () => {
      const { error: resultError } = await client.billing.createSubscription({
        organization_id: orgId,
        app_id: appId,
        price_id: selectedPriceId,
        billing_account_id: selectedAccountId || null,
        status: 'active',
      })

      if (resultError) {
        setError(resultError.message)
        return
      }

      router.push(`/orgs/${orgSlug}/billing/subscriptions`)
      router.refresh()
    })
  }

  return (
    <div className="876-card max-w-3xl space-y-5 p-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="billing-price">Plan price</Label>
          <NativeSelect
            id="billing-price"
            value={selectedPriceId}
            onChange={(event) => setSelectedPriceId(event.target.value)}
            disabled={!optionsReady || isPending}
          >
            <NativeSelectOption value="">
              {setupState.pending
                ? 'Loading prices…'
                : setupState.error
                  ? 'Prices unavailable'
                  : 'Select a price'}
            </NativeSelectOption>
            {prices.map(({ price, label }) => (
              <NativeSelectOption key={price.id} value={price.id}>
                {label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing-account">Billing account</Label>
          <NativeSelect
            id="billing-account"
            value={selectedAccountId}
            onChange={(event) => setSelectedAccountId(event.target.value)}
            disabled={!optionsReady || isPending}
          >
            <NativeSelectOption value="">
              {setupState.pending
                ? 'Loading accounts…'
                : setupState.error
                  ? 'Accounts unavailable'
                  : 'No account'}
            </NativeSelectOption>
            {accounts.map((account) => (
              <NativeSelectOption key={account.id} value={account.id}>
                {account.name || account.email || account.id}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {setupState.error && !error ? (
        <p className="text-destructive text-[0.8125rem]">
          {setupState.error.message}
        </p>
      ) : null}
      {error && <p className="text-destructive text-[0.8125rem]">{error}</p>}

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/orgs/${orgSlug}/billing/subscriptions`)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          variant="info"
          onClick={createSubscription}
          disabled={isPending || !optionsReady || !selectedPriceId}
        >
          Add subscription
        </Button>
      </div>
    </div>
  )
}
