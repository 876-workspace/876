import { UsersIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

import { CustomersTable } from './customers-table'

/** Data half of the persistent customers list column. */
export async function CustomersTableData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  const customers = await service.customers.list(context.tenant.id)
  const rows = customers.map((customer) => {
    const contact = customer.primaryContact ?? customer.contacts?.[0]
    const contactName =
      [contact?.firstName, contact?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      [customer.firstName, customer.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      null

    return {
      id: customer.id,
      name: customer.name,
      companyName: customer.companyName,
      contactName,
      phone:
        customer.phone ??
        customer.workPhone ??
        contact?.mobilePhone ??
        contact?.workPhone ??
        null,
      receivables: Number(customer.outstandingReceivable ?? 0),
      currency: customer.defaultCurrency ?? context.tenant.defaultCurrency,
      status: customer.status,
    }
  })

  return (
    <CustomersTable
      customers={rows}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No customers yet</EmptyTitle>
            <EmptyDescription>
              Create a customer before preparing a quote, invoice, or
              subscription.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  )
}
