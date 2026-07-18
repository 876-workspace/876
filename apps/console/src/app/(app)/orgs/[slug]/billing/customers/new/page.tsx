import { notFound } from 'next/navigation'

import { resolveOrg } from '../../../_data'
import { CustomerCreateForm } from './customer-create-form'

type Props = { params: Promise<{ slug: string }> }

export default async function NewBillingCustomerPage({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="876-page-title">New Billing customer</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Create a customer in {org.name ?? org.slug}&apos;s Billing workspace.
        </p>
      </div>
      <CustomerCreateForm organizationId={org.id} orgSlug={org.slug} />
    </div>
  )
}
