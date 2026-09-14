'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ItemForm as SharedItemForm,
  type ItemFormValues,
} from '@876/billing-ui/item-form'
import { client } from '@/lib/client'

export function ItemForm({
  orgSlug,
  currency,
  item,
}: {
  orgSlug: string
  currency: string
  item?: ItemFormValues
}) {
  const router = useRouter()
  const idempotencyKey = useRef(crypto.randomUUID())
  return (
    <SharedItemForm
      currency={currency}
      item={item}
      onCancel={() => router.back()}
      onSubmit={async (params) => {
        const result = item
          ? await client.items.update(orgSlug, item.id, params)
          : await client.items.create(orgSlug, params, idempotencyKey.current)
        if (!result.error) {
          router.push(
            item ? `/${orgSlug}/items/${item.id}` : `/${orgSlug}/items`
          )
          router.refresh()
        }
        return result
      }}
    />
  )
}
