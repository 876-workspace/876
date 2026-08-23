import type { Metadata } from 'next'
import { PageBreadcrumb } from '@876/ui/page'

import { resolveOrg } from '../../_data'
import { CustomerCreateForm } from './_components/customer-create-form'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'New customer' }
  return {
    title: `${org.name ?? org.slug} • New customer - Organizations`,
  }
}

export default async function NewCustomerPage({ params }: Props) {
  const { slug } = await params
  const organizationId = resolveOrganizationId(slug)

  return (
    <div className="space-y-5">
      <div>
        <PageBreadcrumb
          href={`/orgs/${slug}/customers`}
          label="Customers"
          className="mb-2"
        />
        <h1 className="876-page-title mt-2">New customer</h1>
      </div>
      <CustomerCreateForm organizationId={organizationId} orgSlug={slug} />
    </div>
  )
}

async function resolveOrganizationId(slug: string): Promise<string> {
  const org = await resolveOrg(slug)
  if (!org) throw new Error('Organization not found.')
  return org.id
}
