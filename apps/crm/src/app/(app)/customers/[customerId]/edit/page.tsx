import { AppError } from '@876/ui/app-error'
import { Page, PageBreadcrumb } from '@876/ui/page'
import { notFound } from 'next/navigation'

import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import {
  CustomerForm,
  type CustomerFormValues,
} from '../../_components/customer-form'

type Props = { params: Promise<{ customerId: string }> }

export default async function EditCustomerPage({ params }: Props) {
  const context = await requireCrmContext()
  const $876 = await get876Client()
  const { customerId } = await params
  const result = await $876.customerProfiles.retrieve(context.orgId, customerId)
  if (result.error?.code === 'crm/customer-not-found') notFound()

  if (result.error)
    return (
      <Page>
        <PageBreadcrumb href="/customers" label="Customers" className="mb-4" />
        <h1 className="876-page-title mb-4">Edit customer</h1>
        <AppError
          title="Customer data is temporarily unavailable"
          error={result.error}
          variant="banner"
        />
      </Page>
    )

  const { profile, customer } = result.data
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
      <PageBreadcrumb
        href={`/customers?customer=${encodeURIComponent(profile.id)}`}
        label={customer?.name ?? 'Customer'}
        className="mb-4"
      />
      <h1 className="876-page-title mb-2">Edit customer</h1>
      {customer?.customerType !== 'EXTERNAL' ? (
        <p className="text-muted-foreground mb-6 text-sm">
          Identity fields are managed by the linked 876 account. CRM-local owner
          and status remain editable.
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
