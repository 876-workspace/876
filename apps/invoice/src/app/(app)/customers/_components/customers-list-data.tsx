import * as Sentry from '@sentry/nextjs'
import { redirect } from 'next/navigation'
import { UsersIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getInvoice } from '@/lib/invoice'
import { redirectIfSignedOut } from '@/lib/auth/signed-out-error'
import { CustomersList } from './customers-list'

const TENANT_NOT_FOUND = 'billing/tenant-not-found'
const BILLING_UNREACHABLE = 'billing/unreachable'

function FetchError({
  title,
  message,
  code,
}: {
  title: string
  message: string
  code: string
}) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 text-sm">{message}</p>
      <p className="text-muted-foreground mt-2 font-mono text-xs">{code}</p>
    </div>
  )
}

/**
 * Data half of the list column. Rendered from the layout inside a Suspense
 * boundary, so the toolbar is interactive before this resolves.
 */
export async function CustomersListData() {
  const invoice = await getInvoice()
  if (!invoice) redirect('/no-access')

  const result = await invoice.customers.list({})

  if (result.error) {
    redirectIfSignedOut(result.error.code, '/customers')

    const { code, message } = result.error
    const captured = {
      tags: { category: 'billing_integration' },
      extra: {
        call: 'customers.list',
        errorCode: code,
        organizationId: invoice.organizationId,
      },
    }

    if (code === TENANT_NOT_FOUND) {
      Sentry.captureMessage(
        'Invoice customers list: tenant not found invariant',
        { level: 'error', ...captured }
      )
      return (
        <FetchError
          title="Billing workspace missing"
          message={message}
          code={code}
        />
      )
    }

    if (code === BILLING_UNREACHABLE) {
      Sentry.captureMessage('Invoice customers list: billing unreachable', {
        level: 'warning',
        ...captured,
      })
      return (
        <FetchError
          title="Billing is unreachable"
          message="Please retry shortly. If this persists, contact support."
          code={code}
        />
      )
    }

    Sentry.captureMessage('Invoice customers list failed', {
      level: 'error',
      ...captured,
    })
    return (
      <FetchError
        title="Customers are unavailable right now"
        message={message}
        code={code}
      />
    )
  }

  const customers = result.data.data.map((customer) => {
    const primary = customer.primaryContact
    const contactName = primary
      ? [primary.firstName, primary.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || null
      : null

    return {
      id: customer.id,
      name: customer.name,
      companyName: customer.companyName ?? null,
      contactName,
      phone: customer.phone ?? customer.workPhone ?? null,
      receivables: customer.outstandingReceivable,
      currency: customer.defaultCurrency ?? 'JMD',
      status: customer.status,
    }
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <CustomersList
        customers={customers}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>No customers yet</EmptyTitle>
              <EmptyDescription>
                Create a customer before preparing a quote, invoice, or sales
                receipt.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
