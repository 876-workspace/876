import Link from 'next/link'

import { Badge } from '@876/ui/badge'
import { CreditCard } from '@876/ui/icons'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'Payment Modes - Settings' }

export default async function PaymentModesPage() {
  const context = await requirePagePermission('payments:read')
  const modes = await service.paymentModes.list(context.tenant.id)
  const canManage = context.permissions.includes('payments:write')

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <ResourceToolbar
        title="Payment modes"
        primaryLabel={canManage ? 'Add' : undefined}
        primaryHref={canManage ? '/settings/payment-modes/new' : undefined}
        primaryVariant="info"
        refresh
      />

      <div className="876-card overflow-hidden">
        {modes.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CreditCard className="text-muted-foreground mx-auto size-6" />
            <p className="mt-3 font-medium">No payment modes</p>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {modes.map((mode) => (
              <div
                key={mode.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <span className="876-icon-tile">
                  <CreditCard className="text-876-blue size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{mode.name}</p>
                    {mode.isDefault ? (
                      <Badge variant="secondary">Default</Badge>
                    ) : null}
                    {mode.isSystem ? (
                      <Badge variant="outline">Built in</Badge>
                    ) : null}
                    {!mode.isActive ? (
                      <Badge variant="secondary">Archived</Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {mode.isActive
                      ? 'Available when recording payments.'
                      : 'Retained for payment history.'}
                  </p>
                </div>
                {canManage ? (
                  <Link
                    href={`/settings/payment-modes/${mode.id}/edit`}
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    Edit
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  )
}
