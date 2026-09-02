import * as Sentry from '@sentry/nextjs'
import { redirect } from 'next/navigation'
import { CreditCardIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getInvoiceContext } from '@/lib/auth/context'
import { listInvoices } from '@/app/(app)/_lib/list-data'
import { redirectIfSignedOut } from '@/lib/auth/signed-out-error'
import { InvoicesList } from './invoices-list'

const TENANT_NOT_FOUND = 'billing/tenant-not-found'
const BILLING_UNREACHABLE = 'billing/unreachable'

export async function InvoicesListData() {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')
  const result = await listInvoices(context.orgId)
  if (result.error) {
    redirectIfSignedOut(result.error.code, '/invoices')

    const isTenantNotFound = result.error.code === TENANT_NOT_FOUND
    const isUnreachable = result.error.code === BILLING_UNREACHABLE
    if (isTenantNotFound) {
      Sentry.captureMessage(
        'Invoice invoices list: tenant not found invariant',
        {
          level: 'error',
          tags: { category: 'billing_client' },
          extra: {
            call: 'invoices.list',
            errorCode: result.error.code,
            organizationId: context.orgId,
          },
        }
      )
      return (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium">Billing workspace missing</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {result.error.message}
          </p>
          <p className="text-muted-foreground mt-2 font-mono text-xs">
            {result.error.code}
          </p>
        </div>
      )
    }
    if (isUnreachable) {
      Sentry.captureMessage('Invoice invoices list: billing unreachable', {
        level: 'warning',
        tags: { category: 'billing_client' },
        extra: {
          call: 'invoices.list',
          errorCode: result.error.code,
          organizationId: context.orgId,
        },
      })
      return (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium">Billing is unreachable</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Please retry shortly. If this persists, contact support.
          </p>
          <p className="text-muted-foreground mt-2 font-mono text-xs">
            {result.error.code}
          </p>
        </div>
      )
    }
    Sentry.captureMessage('Invoice invoices list failed', {
      level: 'error',
      tags: { category: 'billing_client' },
      extra: {
        call: 'invoices.list',
        errorCode: result.error.code,
        organizationId: context.orgId,
      },
    })
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">
          Invoices are unavailable right now
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          {result.error.message}
        </p>
        <p className="text-muted-foreground mt-2 font-mono text-xs">
          {result.error.code}
        </p>
      </div>
    )
  }

  const invoices = result.data.data.map((invoice) => {
    const inv = invoice as unknown as Record<string, unknown>
    return {
      id: String(inv.id),
      number: String(inv.number ?? inv.id),
      totalAmount: (inv.totalAmount as string) ?? '0',
      amountDue:
        (inv.amountDue as string) ?? (inv.totalAmount as string) ?? '0',
      currency: String(inv.currency ?? 'JMD'),
      status: String(inv.status ?? 'DRAFT'),
      customer: {
        name: String(
          (inv.customer as Record<string, unknown>)?.name ??
            inv.customerName ??
            '—'
        ),
      },
    }
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <InvoicesList
        invoices={invoices}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CreditCardIcon />
              </EmptyMedia>
              <EmptyTitle>No invoices yet</EmptyTitle>
              <EmptyDescription>
                Create a draft invoice from a customer and item. It will not
                send or collect payment automatically.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
