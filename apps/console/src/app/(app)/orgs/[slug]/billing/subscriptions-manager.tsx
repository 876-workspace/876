'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  AdminBillingAccount,
  AdminProduct,
  AdminSubscription,
} from '@876/admin'
import { buttonVariants, Button } from '@876/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { CreditCard, Plus, SearchIcon, Trash } from '@876/ui/icons'
import { Input } from '@876/ui/input'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { client } from '@/lib/client'
import { formatDate } from '@/lib/format'

import {
  StatusBadge,
  buildPriceOptions,
  type PriceOption,
} from './billing-shared'

type Props = {
  orgSlug: string
  accounts: AdminBillingAccount[]
  subscriptions: AdminSubscription[]
  products: AdminProduct[]
}

const subscriptionStatuses = [
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'paused',
  'blocked',
  'canceled',
] as const satisfies AdminSubscription['status'][]

export function SubscriptionsManager({
  orgSlug,
  accounts,
  subscriptions,
  products,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const prices = useMemo(
    () => buildPriceOptions(products.filter((product) => product.active)),
    [products]
  )

  const filteredSubscriptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return subscriptions

    return subscriptions.filter((subscription) => {
      const account = accounts.find(
        (billingAccount) =>
          billingAccount.id === subscription.billing_account_id
      )
      const item = subscription.items[0] ?? null
      const parts = [
        subscription.id,
        subscription.app_name,
        subscription.app_slug,
        subscription.status,
        item?.product_name,
        item?.product_slug,
        item?.price_id,
        account?.name,
        account?.email,
        account?.invoice_email,
      ].filter(Boolean) as string[]

      return parts.some((part) => part.toLowerCase().includes(trimmed))
    })
  }, [accounts, query, subscriptions])

  function updateSubscription(
    subscription: AdminSubscription,
    body: Parameters<typeof client.billing.updateSubscription>[1]
  ) {
    setError(null)
    startTransition(async () => {
      const { error: resultError } = await client.billing.updateSubscription(
        subscription.id,
        body
      )
      if (resultError) {
        setError(resultError.message)
        return
      }

      router.refresh()
    })
  }

  function removeSubscription(subscriptionId: string) {
    setError(null)
    startTransition(async () => {
      const { error: resultError } =
        await client.billing.deleteSubscription(subscriptionId)
      if (resultError) {
        setError(resultError.message)
        return
      }

      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80 lg:w-96">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search subscriptions..."
            className="pl-9"
            aria-label="Search subscriptions"
          />
        </div>
        <Link
          href={`/orgs/${orgSlug}/billing/subscriptions/new`}
          className={buttonVariants({ variant: 'info', size: 'sm' })}
        >
          <Plus className="size-4" strokeWidth={2.25} />
          Add subscription
        </Link>
      </div>

      {error && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="876-card overflow-hidden">
        {filteredSubscriptions.length === 0 ? (
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CreditCard aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No subscriptions</EmptyTitle>
              <EmptyDescription>
                {query.trim()
                  ? `No subscriptions match "${query.trim()}".`
                  : 'Attach a plan price to start billing this organization.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="divide-876-surface-border divide-y">
            {filteredSubscriptions.map((subscription) => (
              <SubscriptionRow
                key={subscription.id}
                accounts={accounts}
                prices={prices}
                subscription={subscription}
                disabled={isPending}
                onUpdate={updateSubscription}
                onDelete={removeSubscription}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SubscriptionRow({
  accounts,
  prices,
  subscription,
  disabled,
  onUpdate,
  onDelete,
}: {
  accounts: AdminBillingAccount[]
  prices: PriceOption[]
  subscription: AdminSubscription
  disabled: boolean
  onUpdate: (
    subscription: AdminSubscription,
    body: Parameters<typeof client.billing.updateSubscription>[1]
  ) => void
  onDelete: (subscriptionId: string) => void
}) {
  const item = subscription.items[0] ?? null
  const account = accounts.find(
    (billingAccount) => billingAccount.id === subscription.billing_account_id
  )

  return (
    <div className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1fr)_9rem_14rem_14rem_16rem_auto] xl:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {item?.product_name || item?.product_slug || subscription.app_slug}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {subscription.id} · {formatDate(subscription.created_at)}
        </p>
      </div>
      <StatusBadge status={subscription.status} />
      <NativeSelect
        value={subscription.status}
        onChange={(event) =>
          onUpdate(subscription, {
            status: event.target.value as AdminSubscription['status'],
          })
        }
        disabled={disabled}
        aria-label="Subscription status"
      >
        {subscriptionStatuses.map((status) => (
          <NativeSelectOption key={status} value={status}>
            {status}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        value={item?.price_id ?? ''}
        onChange={(event) =>
          onUpdate(subscription, { price_id: event.target.value || undefined })
        }
        disabled={disabled}
        aria-label="Subscription price"
      >
        <NativeSelectOption value="">No price</NativeSelectOption>
        {prices.map(({ price, label }) => (
          <NativeSelectOption key={price.id} value={price.id}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        value={subscription.billing_account_id ?? ''}
        onChange={(event) =>
          onUpdate(subscription, {
            billing_account_id: event.target.value || null,
          })
        }
        disabled={disabled}
        aria-label="Billing account"
      >
        <NativeSelectOption value="">No account</NativeSelectOption>
        {accounts.map((billingAccount) => (
          <NativeSelectOption key={billingAccount.id} value={billingAccount.id}>
            {billingAccount.name || billingAccount.email || billingAccount.id}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <div className="flex items-center justify-between gap-2 xl:justify-end">
        <span className="text-muted-foreground truncate text-xs xl:hidden">
          {account?.name || account?.email || 'No billing account'}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onDelete(subscription.id)}
          disabled={disabled}
          aria-label="Delete subscription"
        >
          <Trash className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
