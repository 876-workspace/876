import { notFound } from 'next/navigation'

import { CreateForm } from '@/components/billing-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>
}) {
  const { planId } = await params
  const context = await requirePagePermission('catalog:write')
  const plan = await service.plans.retrieve(context.tenant.id, planId)
  if (!plan) notFound()

  return (
    <CreateForm
      title="Plan"
      method="PATCH"
      endpoint={`/api/v1/plans/${plan.id}`}
      returnUrl={`/plans/${plan.id}`}
      submitLabel="Save plan"
      fields={[
        {
          name: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          initialValue: plan.name,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'text',
          initialValue: plan.description ?? '',
          emptyAsNull: true,
        },
        {
          name: 'imageUrl',
          label: 'Image URL',
          type: 'text',
          initialValue: plan.imageUrl ?? '',
          emptyAsNull: true,
        },
        {
          name: 'unitName',
          label: 'Unit name',
          type: 'text',
          initialValue: plan.unitName ?? '',
          emptyAsNull: true,
        },
        {
          name: 'taxCode',
          label: 'Tax code',
          type: 'text',
          initialValue: plan.taxCode ?? '',
          emptyAsNull: true,
        },
        {
          name: 'trialDays',
          label: 'Trial days',
          type: 'number',
          initialValue: String(plan.trialDays),
        },
        {
          name: 'isTaxable',
          label: 'Taxable',
          type: 'checkbox',
          initialValue: plan.isTaxable,
        },
        {
          name: 'isFree',
          label: 'Free plan',
          type: 'checkbox',
          initialValue: plan.isFree,
          description:
            'Paid prices must be archived before changing a plan to free.',
        },
        {
          name: 'showInCheckout',
          label: 'Show in checkout',
          type: 'checkbox',
          initialValue: plan.showInCheckout,
        },
      ]}
    />
  )
}
