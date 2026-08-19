import { resolveOrg } from '../../../_data'
import { CustomerCreateForm } from './_components/customer-create-form'

type Props = { params: Promise<{ slug: string }> }

export default async function NewBillingCustomerPage({ params }: Props) {
  const { slug } = await params
  const organizationId = resolveOrganizationId(slug)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="876-page-title">New Billing customer</h1>
        <p className="text-muted-foreground mt-1 text-[0.8125rem]">
          Create a customer in this organization&apos;s Billing workspace.
        </p>
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
