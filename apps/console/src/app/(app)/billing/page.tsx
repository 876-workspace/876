import { billing } from '@/lib/services/billing'
import { workspace } from '@/lib/services/workspace'
import { platform } from '@/lib/services/platform'
import { Suspense } from 'react'
import { CreditCard } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page, PageHeader, PageTitle, PageDescription } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

export const metadata = {
  title: 'Billing',
  description: 'Manage billing accounts and subscriptions.',
}

export default function BillingPage() {
  return (
    <Page>
      <PageHeader className="mb-5">
        <PageTitle>Billing</PageTitle>
        <PageDescription>
          Manage billing accounts and subscriptions across the platform.
        </PageDescription>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Suspense fallback={<BillingCardFallback title="Billing Accounts" />}>
          <BillingAccountsCard />
        </Suspense>
        <Suspense fallback={<BillingCardFallback title="Subscriptions" />}>
          <SubscriptionsCard />
        </Suspense>
      </div>
    </Page>
  )
}

async function BillingAccountsCard() {
  const result = await workspace.billingAccounts.list({ limit: 25 })
  const accounts = result.data?.data ?? []

  return (
    <section className="876-card p-5">
      <h3 className="mb-4 text-[0.8125rem] font-semibold">
        Billing Accounts ({accounts.length})
      </h3>
      {accounts.length === 0 ? (
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CreditCard />
            </EmptyMedia>
            <EmptyTitle>No billing accounts</EmptyTitle>
            <EmptyDescription>
              Billing accounts are created when an organization sets up payment.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="divide-876-surface-border -mx-5 divide-y">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between px-5 py-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[0.8125rem] font-medium">
                  {account.name || account.organization_id}
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  {account.id}
                </span>
              </div>
              <span className="text-muted-foreground text-xs">
                {account.email || '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

async function SubscriptionsCard() {
  const result = await platform.subscriptions.list({ limit: 25 })
  const subscriptions = result.data?.data ?? []

  return (
    <section className="876-card p-5">
      <h3 className="mb-4 text-[0.8125rem] font-semibold">
        Subscriptions ({subscriptions.length})
      </h3>
      {subscriptions.length === 0 ? (
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CreditCard />
            </EmptyMedia>
            <EmptyTitle>No subscriptions</EmptyTitle>
            <EmptyDescription>
              Subscriptions are created when an organization subscribes to an
              app.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="divide-876-surface-border -mx-5 divide-y">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between px-5 py-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[0.8125rem] font-medium">
                  {sub.app_slug || sub.app_id}
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  {sub.id}
                </span>
              </div>
              <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize">
                {sub.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function BillingCardFallback({ title }: { title: string }) {
  return (
    <section className="876-card p-5">
      <h3 className="mb-4 text-[0.8125rem] font-semibold">{title}</h3>
      <div className="-mx-5 space-y-px">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="border-876-surface-border flex items-center justify-between border-t px-5 py-3"
          >
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </section>
  )
}
