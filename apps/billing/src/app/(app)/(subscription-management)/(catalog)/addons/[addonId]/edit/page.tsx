import { notFound } from 'next/navigation'

import { CreateForm } from '@/components/billing-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export default async function EditAddonPage({
  params,
}: {
  params: Promise<{ addonId: string }>
}) {
  const { addonId } = await params
  const context = await requirePagePermission('catalog:write')
  const addon = await service.addons.retrieve(context.tenant.id, addonId)
  if (!addon) notFound()

  return (
    <CreateForm
      title="Add-on"
      method="PATCH"
      endpoint={`/api/v1/addons/${addon.id}`}
      returnUrl={`/addons/${addon.id}`}
      submitLabel="Save add-on"
      fields={[
        {
          name: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          initialValue: addon.name,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'text',
          initialValue: addon.description ?? '',
          emptyAsNull: true,
        },
        {
          name: 'imageUrl',
          label: 'Image URL',
          type: 'text',
          initialValue: addon.imageUrl ?? '',
          emptyAsNull: true,
        },
        {
          name: 'unitName',
          label: 'Unit name',
          type: 'text',
          initialValue: addon.unitName ?? '',
          emptyAsNull: true,
        },
        {
          name: 'taxCode',
          label: 'Tax code',
          type: 'text',
          initialValue: addon.taxCode ?? '',
          emptyAsNull: true,
        },
        {
          name: 'isTaxable',
          label: 'Taxable',
          type: 'checkbox',
          initialValue: addon.isTaxable,
        },
        {
          name: 'showInCheckout',
          label: 'Show in checkout',
          type: 'checkbox',
          initialValue: addon.showInCheckout,
        },
        {
          name: 'allowPortalManagement',
          label: 'Allow customer portal management',
          type: 'checkbox',
          initialValue: addon.allowPortalManagement,
        },
      ]}
    />
  )
}
