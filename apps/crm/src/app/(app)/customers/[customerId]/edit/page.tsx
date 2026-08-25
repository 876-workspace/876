import { notFound } from 'next/navigation'

import { Page, PageBreadcrumb } from '@876/ui/page'

import { retrieveCustomer } from '@/lib/crm/customers'

import { CustomerForm, type CustomerFormValues } from '../../_components/customer-form'

type Props = { params: Promise<{ customerId: string }> }

export default async function EditCustomerPage({ params }: Props) {
  const { customerId } = await params
  const result = await retrieveCustomer(customerId)
  if (!result) notFound()

  const { profile, customer } = result
  const initial: CustomerFormValues = {
    customerKind: customer?.customerKind ?? 'INDIVIDUAL',
    firstName: customer?.firstName ?? '',
    lastName: customer?.lastName ?? '',
    companyName: customer?.companyName ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    ownerId: profile.ownerId ?? '',
    status: profile.status,
  }

  return (
    <Page>
      <PageBreadcrumb href={`/customers/${profile.id}`} label={customer?.name ?? 'Customer'} className="mb-4" />
      <h1 className="876-page-title mb-2">Edit customer</h1>
      {customer?.customerType !== 'EXTERNAL' ? (
        <p className="text-muted-foreground mb-6 text-sm">
          Identity fields are managed by the linked 876 account. CRM-local owner and status remain editable.
        </p>
      ) : null}
      <CustomerForm
        customerId={profile.id}
        initial={initial}
        editableIdentity={customer?.customerType === 'EXTERNAL'}
      />
    </Page>
  )
}
