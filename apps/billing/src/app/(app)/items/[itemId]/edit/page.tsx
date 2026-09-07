import { notFound } from 'next/navigation'

import { CreateForm } from '@/components/patterns/create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatMinorAmountInput } from '@/lib/format'
import { service } from '@/lib/service'

export const metadata = { title: 'Edit item' }

const GOOD_ONLY = [{ field: 'type', equals: 'GOOD' }] as const
const TRACKED_GOOD = [
  { field: 'type', equals: 'GOOD' },
  { field: 'trackStock', equals: true },
] as const

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>
}) {
  const { itemId } = await params
  const context = await requirePagePermission('catalog:write')
  const [item, currencies] = await Promise.all([
    service.items.retrieve(context.tenant.id, itemId),
    service.currencies.list(context.tenant.id),
  ])
  if (!item) notFound()

  const currencyOptions = currencies.map(({ currency }) => ({
    value: currency.code,
    label: `${currency.name} (${currency.code})`,
  }))
  const sellingDecimalPlaces =
    currencies.find(
      ({ currency }) => currency.code === item.defaultSellingCurrency
    )?.currency.decimalPlaces ?? 2
  const costDecimalPlaces =
    currencies.find(
      ({ currency }) => currency.code === item.defaultCostCurrency
    )?.currency.decimalPlaces ?? 2

  return (
    <CreateForm
      title="Item"
      method="PATCH"
      endpoint={`/api/v1/items/${item.id}`}
      returnUrl={`/items/${item.id}`}
      submitLabel="Save item"
      fields={[
        {
          name: 'type',
          label: 'Type',
          type: 'select',
          required: true,
          initialValue: item.type,
          options: [
            { label: 'Service', value: 'SERVICE' },
            { label: 'Good', value: 'GOOD' },
          ],
        },
        {
          name: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          initialValue: item.name,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'text',
          initialValue: item.description ?? '',
          emptyAsNull: true,
        },
        {
          name: 'sku',
          label: 'SKU',
          type: 'text',
          initialValue: item.sku ?? '',
          emptyAsNull: true,
        },
        {
          name: 'unit',
          label: 'Unit',
          type: 'text',
          initialValue: item.unit ?? '',
          emptyAsNull: true,
          placeholder: 'hour, piece, kg',
        },
        {
          name: 'trackStock',
          label: 'Track stock',
          type: 'checkbox',
          initialValue: item.trackStock,
          description: 'Keep a current stock count for this good.',
          visibleWhen: [...GOOD_ONLY],
        },
        {
          name: 'lowStockThreshold',
          label: 'Low stock warning',
          type: 'number',
          initialValue:
            item.lowStockThreshold === null
              ? ''
              : String(item.lowStockThreshold),
          emptyAsNull: true,
          visibleWhen: [...TRACKED_GOOD],
        },
        {
          name: 'allowOutOfStock',
          label: 'Allow out-of-stock sales',
          type: 'checkbox',
          initialValue: item.allowOutOfStock,
          description:
            'Allow invoice finalization to take this item below zero.',
          visibleWhen: [...TRACKED_GOOD],
        },
        {
          name: 'defaultSellingAmount',
          label: 'Default selling price',
          type: 'money',
          pairedWith: 'defaultSellingCurrency',
          initialValue:
            item.defaultSellingAmount === null
              ? ''
              : formatMinorAmountInput(
                  item.defaultSellingAmount,
                  sellingDecimalPlaces
                ),
        },
        {
          name: 'defaultSellingCurrency',
          label: 'Selling currency',
          type: 'select',
          pairedWith: 'defaultSellingAmount',
          initialValue: item.defaultSellingCurrency ?? '',
          options: currencyOptions,
        },
        {
          name: 'defaultCostAmount',
          label: 'Default cost',
          type: 'money',
          pairedWith: 'defaultCostCurrency',
          initialValue:
            item.defaultCostAmount === null
              ? ''
              : formatMinorAmountInput(
                  item.defaultCostAmount,
                  costDecimalPlaces
                ),
        },
        {
          name: 'defaultCostCurrency',
          label: 'Cost currency',
          type: 'select',
          pairedWith: 'defaultCostAmount',
          initialValue: item.defaultCostCurrency ?? '',
          options: currencyOptions,
        },
        {
          name: 'isTaxable',
          label: 'Taxable item',
          type: 'checkbox',
          initialValue: item.isTaxable,
        },
        {
          name: 'taxCode',
          label: 'Tax code',
          type: 'text',
          initialValue: item.taxCode ?? '',
          emptyAsNull: true,
        },
      ]}
    />
  )
}
