import type { ReactNode } from 'react'

import { AppError } from '@876/ui/app-error'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
import { RouteTabs, type RouteTabItem } from '@876/ui/route-tabs'

import { getInvoiceContextResult } from '@/lib/auth/context'
import { resolveInvoiceFinanceAccess } from '@/lib/auth/finance-access'
import { requireAppPermission } from '@/lib/auth/guards'

export const metadata = { title: 'Finance - Settings' }

export default async function FinanceSettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireAppPermission('settings.view')

  const context = await getInvoiceContextResult()
  if (context.status !== 'ok') return <FinanceAccessPage />

  const access = await resolveInvoiceFinanceAccess(
    context.context.orgId,
    context.context.userId,
    context.context.role
  )
  if (access.status !== 'ok') return <FinanceAccessPage />

  const permissions = access.viewer.permissions
  const tabs: RouteTabItem[] = [
    ...(permissions.includes('currencies:read')
      ? [{ label: 'Currencies', href: '/settings/finance/currencies' }]
      : []),
    ...(permissions.includes('payments:read')
      ? [{ label: 'Payment modes', href: '/settings/finance/payment-modes' }]
      : []),
    ...(permissions.includes('taxes:read')
      ? [{ label: 'Taxes', href: '/settings/finance/taxes' }]
      : []),
  ]

  if (tabs.length === 0) return <FinanceAccessPage />

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <PageHeader className="mb-6">
        <PageTitle>Finance</PageTitle>
      </PageHeader>
      <div className="border-876-surface-border mb-6 border-b">
        <RouteTabs tabs={tabs} aria-label="Finance settings" />
      </div>
      {children}
    </Page>
  )
}

function FinanceAccessPage() {
  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <PageHeader className="mb-8">
        <PageTitle>Finance</PageTitle>
      </PageHeader>
      <AppError
        title="Finance settings are unavailable"
        error={{
          code: 'invoice/forbidden',
          message: 'You do not have access to finance settings.',
        }}
        variant="section"
      />
    </Page>
  )
}
