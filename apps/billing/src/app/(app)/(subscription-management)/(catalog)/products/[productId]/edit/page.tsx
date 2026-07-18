import { notFound } from 'next/navigation'

import { CreateForm } from '@/components/billing-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params
  const context = await requirePagePermission('catalog:write')
  const [product, freePlans] = await Promise.all([
    service.products.retrieve(context.tenant.id, productId),
    service.plans.list(context.tenant.id, true, productId),
  ])
  if (!product) notFound()

  return (
    <CreateForm
      title="Product"
      method="PATCH"
      endpoint={`/api/v1/products/${product.id}`}
      returnUrl={`/products/${product.id}`}
      submitLabel="Save product"
      fields={[
        {
          name: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          initialValue: product.name,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'text',
          initialValue: product.description ?? '',
          emptyAsNull: true,
        },
        {
          name: 'type',
          label: 'Product type',
          type: 'select',
          initialValue: product.type,
          options: [
            { value: 'SERVICE', label: 'Service' },
            { value: 'GOOD', label: 'Physical good' },
          ],
        },
        {
          name: 'fallbackPlanId',
          label: 'Free fallback plan',
          type: 'select',
          initialValue: product.fallbackPlanId ?? '',
          emptyAsNull: true,
          description:
            'Used when subscription workflows explicitly downgrade to a free plan.',
          options: freePlans
            .filter((plan) => plan.isFree)
            .map((plan) => ({ value: plan.id, label: plan.name })),
        },
        {
          name: 'notificationRecipients',
          label: 'Notification recipients',
          type: 'text',
          initialValue: product.notificationRecipients ?? '',
          emptyAsNull: true,
        },
        {
          name: 'redirectUrl',
          label: 'Post-checkout redirect URL',
          type: 'text',
          initialValue: product.redirectUrl ?? '',
          emptyAsNull: true,
        },
      ]}
    />
  )
}
