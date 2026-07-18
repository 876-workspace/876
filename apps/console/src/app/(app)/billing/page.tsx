import type { AdminBillingAccount, AdminSubscription } from '@876/admin'
import { CreditCard } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page, PageHeader, PageTitle, PageDescription } from '@876/ui/page'

import { $876 } from '@/lib/876'

export const metadata = {
  title: 'Billing',
  description: 'Manage billing accounts and subscriptions.',
}

export default async function BillingPage() {
  const [accountsResult, subscriptionsResult] = await Promise.all([
    $876.billingAccounts.list({ limit: 25 }),
    $876.subscriptions.list({ limit: 25 }),
  ])

  const accounts: AdminBillingAccount[] = accountsResult.data?.data ?? []
  const subscriptions: AdminSubscription[] =
    subscriptionsResult.data?.data ?? []

  return (
    <Page>
      <PageHeader className="mb-5">
        <PageTitle>Billing</PageTitle>
        <PageDescription>
          Manage billing accounts and subscriptions across the platform.
        </PageDescription>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Billing Accounts */}
        <section className="876-card p-5">
          <h3 className="mb-4 text-sm font-semibold">
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
                  Billing accounts are created when an organization sets up
                  payment.
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
                    <span className="text-sm font-medium">
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

        {/* Subscriptions */}
        <section className="876-card p-5">
          <h3 className="mb-4 text-sm font-semibold">
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
                  Subscriptions are created when an organization subscribes to
                  an app.
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
                    <span className="text-sm font-medium">
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
      </div>
    </Page>
  )
}
