'use client'

import { useRouter } from 'next/navigation'
import {
  ItemForm as SharedItemForm,
  type ItemFormValues,
} from '@876/billing-ui/item-form'
import { client } from '@/lib/client'

export type { ItemFormValues }

export function ItemForm({
  currency,
  item,
}: {
  currency: string
  item?: ItemFormValues
}) {
  const router = useRouter()
  return (
    <SharedItemForm
      currency={currency}
      item={item}
      onCancel={() => router.back()}
      onSubmit={async (params) => {
        const result = item
          ? await client.items.update(item.id, params)
          : await client.items.create(params)
        if (!result.error) {
          router.push(item ? `/items/${item.id}` : '/items')
          router.refresh()
        }
        return result
      }}
    />
  )
}
